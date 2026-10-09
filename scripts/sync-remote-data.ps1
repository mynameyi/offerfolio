[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$SshTarget,

  [Parameter(Mandatory = $true)]
  [string]$RemoteDirectory,

  [string]$IdentityFile,

  [switch]$Preview
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$uploadsRoot = Join-Path $repoRoot "data\uploads"
$exporter = Join-Path $PSScriptRoot "export-deploy-data.mjs"

if ($SshTarget -notmatch '^[A-Za-z0-9_.@:-]+$') {
  throw "SshTarget must be a host, user@host, or SSH config alias without shell characters."
}
if ($RemoteDirectory -notmatch '^/[A-Za-z0-9._/-]+$' -or $RemoteDirectory -match '(^|/)\.\.?(/|$)') {
  throw "RemoteDirectory must be an absolute POSIX path without spaces or parent-directory segments."
}

$sshCommand = Get-Command ssh.exe -ErrorAction SilentlyContinue
$scpCommand = Get-Command scp.exe -ErrorAction SilentlyContinue
$tarCommand = Get-Command tar.exe -ErrorAction SilentlyContinue
$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $sshCommand -or -not $scpCommand -or -not $tarCommand -or -not $nodeCommand) {
  throw "This script requires Windows OpenSSH (ssh/scp), tar.exe, and Node.js on PATH."
}

$sshOptions = @("-o", "BatchMode=yes")
if ($IdentityFile) {
  $IdentityFile = (Resolve-Path $IdentityFile).Path
  $sshOptions += @("-i", $IdentityFile, "-o", "IdentitiesOnly=yes")
}

$tempDirectory = Join-Path ([System.IO.Path]::GetTempPath()) ("offerfolio-sync-" + [guid]::NewGuid().ToString("N"))
$bundlePath = Join-Path $tempDirectory "deploy-data.json"
$archivePath = Join-Path $tempDirectory "changed-media.tar.gz"
$remoteBundle = "/tmp/offerfolio-data-$([guid]::NewGuid().ToString('N')).json"
$remoteArchive = "/tmp/offerfolio-media-$([guid]::NewGuid().ToString('N')).tar.gz"
$uploadedRemotePaths = @()

function Invoke-Ssh([string]$Command) {
  $output = & $sshCommand.Source @sshOptions $SshTarget $Command
  if ($LASTEXITCODE -ne 0) { throw "SSH command failed with exit code $LASTEXITCODE." }
  return $output
}

try {
  New-Item -ItemType Directory -Path $tempDirectory | Out-Null
  & $nodeCommand.Source $exporter $bundlePath
  if ($LASTEXITCODE -ne 0) { throw "Could not export local non-visitor data." }
  $bundle = Get-Content -LiteralPath $bundlePath -Raw | ConvertFrom-Json

  $remoteCommand = "cd '$RemoteDirectory' && if [ -d data/uploads ]; then find data/uploads -type f -exec sha256sum {} +; fi"
  $remoteManifestLines = Invoke-Ssh $remoteCommand
  Invoke-Ssh "cd '$RemoteDirectory' && docker compose exec -T offerfolio node --check /app/scripts/import-deploy-data.mjs" | Out-Null
  $remoteHashes = @{}
  foreach ($line in $remoteManifestLines) {
    if ($line -match '^([A-Fa-f0-9]{64})\s+\*?(data/uploads/.+)$') {
      $remoteHashes[$Matches[2]] = $Matches[1].ToLowerInvariant()
    }
  }

  $localFiles = @()
  if (Test-Path -LiteralPath $uploadsRoot) {
    $localFiles = @(Get-ChildItem -LiteralPath $uploadsRoot -Recurse -File | Where-Object { $_.FullName -notmatch '[\\/]\.transcode-[^\\/]+[\\/]' })
  }
  $changedFiles = @()
  foreach ($file in $localFiles) {
    $relativePath = [System.IO.Path]::GetRelativePath($repoRoot, $file.FullName).Replace('\', '/')
    $hash = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    if (-not $remoteHashes.ContainsKey($relativePath) -or $remoteHashes[$relativePath] -ne $hash) {
      $changedFiles += [pscustomobject]@{ FullName = $file.FullName; RelativePath = $relativePath; Hash = $hash }
    }
  }

  $localBytes = (Get-Item -LiteralPath $bundlePath).Length
  $mediaBytes = 0
  foreach ($file in $changedFiles) { $mediaBytes += (Get-Item -LiteralPath $file.FullName).Length }
  Write-Output "本地档案：1 条；投递话术：$($bundle.applicationScripts.Count) 条；投递链接：$($bundle.shareLinks.Count) 条"
  Write-Output "媒体：$($changedFiles.Count) 个文件需要传输，约 $([math]::Round($mediaBytes / 1MB, 2)) MB；数据包约 $([math]::Round($localBytes / 1KB, 1)) KB"
  if ($Preview) {
    Write-Output "预览模式：没有写入远端。"
    return
  }

  Invoke-Ssh "mkdir -p '$RemoteDirectory/data/uploads'" | Out-Null
  if ($changedFiles.Count -gt 0) {
    $relativePaths = @($changedFiles | ForEach-Object { $_.RelativePath })
    $fileListPath = Join-Path $tempDirectory "changed-media.txt"
    [System.IO.File]::WriteAllLines($fileListPath, $relativePaths, [System.Text.Encoding]::ASCII)
    $tarArgs = @("-czf", $archivePath, "-C", $repoRoot, "-T", $fileListPath)
    & $tarCommand.Source @tarArgs
    if ($LASTEXITCODE -ne 0) { throw "Could not create the changed-media archive." }

    foreach ($file in $changedFiles) {
      $currentHash = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
      if ($currentHash -ne $file.Hash) { throw "Media changed during sync; rerun to get a consistent upload: $($file.RelativePath)" }
    }

    & $scpCommand.Source @sshOptions $archivePath "${SshTarget}:$remoteArchive"
    if ($LASTEXITCODE -ne 0) { throw "Could not upload the changed-media archive." }
    $uploadedRemotePaths += $remoteArchive
    Invoke-Ssh "tar -xzf '$remoteArchive' -C '$RemoteDirectory' && rm -f '$remoteArchive'" | Out-Null
    $uploadedRemotePaths = @()
  }

  & $scpCommand.Source @sshOptions $bundlePath "${SshTarget}:$remoteBundle"
  if ($LASTEXITCODE -ne 0) { throw "Could not upload the non-visitor data bundle." }
  $uploadedRemotePaths += $remoteBundle

  $importCommand = 'cd "{0}" && container_id=$(docker compose ps -q offerfolio) && test -n "$container_id" && trap ''docker exec "$container_id" rm -f /app/data/.offerfolio-sync.json >/dev/null 2>&1 || true; rm -f "{1}"'' EXIT && docker cp "{1}" "$container_id:/app/data/.offerfolio-sync.json" && docker compose exec -T offerfolio node /app/scripts/import-deploy-data.mjs /app/data/.offerfolio-sync.json' -f $RemoteDirectory, $remoteBundle
  $importOutput = Invoke-Ssh $importCommand
  $uploadedRemotePaths = @()
  Write-Output "远端同步完成。"
  $importOutput | ForEach-Object { Write-Output $_ }
}
finally {
  if ($uploadedRemotePaths.Count -gt 0) {
    $cleanup = ($uploadedRemotePaths | ForEach-Object { "'$_'" }) -join " "
    try { Invoke-Ssh "rm -f $cleanup" | Out-Null } catch { }
  }
  Remove-Item -LiteralPath $tempDirectory -Recurse -Force -ErrorAction SilentlyContinue
}
