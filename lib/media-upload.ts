import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, mkdtemp, rename, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import ffmpegPath from "ffmpeg-static";

const MIME_EXTENSIONS: Record<string, { extension: string; kind: "image" | "video" }> = {
  "image/jpeg": { extension: ".jpg", kind: "image" },
  "image/png": { extension: ".png", kind: "image" },
  "image/webp": { extension: ".webp", kind: "image" },
  "image/gif": { extension: ".gif", kind: "image" },
  "image/avif": { extension: ".avif", kind: "image" },
  "video/mp4": { extension: ".mp4", kind: "video" },
  "video/webm": { extension: ".webm", kind: "video" },
  "video/ogg": { extension: ".ogv", kind: "video" },
  "video/quicktime": { extension: ".mov", kind: "video" },
  "video/x-m4v": { extension: ".m4v", kind: "video" },
};

export function getUploadedMediaType(mimeType: string) {
  return MIME_EXTENSIONS[mimeType.toLowerCase()] ?? null;
}

function transcodeToH264(inputPath: string, outputPath: string) {
  return new Promise<void>((resolve, reject) => {
    const args = [
      "-hide_banner", "-loglevel", "error", "-nostdin", "-y",
      "-i", inputPath,
      "-map", "0:v:0", "-map", "0:a:0?",
      "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
      "-c:v", "libx264", "-preset", "medium", "-crf", "22",
      "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k",
      "-movflags", "+faststart", outputPath,
    ];
    const executablePath = process.env.FFMPEG_PATH || ffmpegPath || "ffmpeg";
    const ffmpeg = spawn(/* turbopackIgnore: true */ executablePath, args, { stdio: ["ignore", "ignore", "pipe"] });
    let errorOutput = "";

    ffmpeg.stderr.setEncoding("utf8");
    ffmpeg.stderr.on("data", (chunk: string) => {
      errorOutput = `${errorOutput}${chunk}`.slice(-4000);
    });
    ffmpeg.once("error", () => reject(new Error("无法启动 FFmpeg 视频转码工具。")));
    ffmpeg.once("close", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(errorOutput.trim() || `FFmpeg 转码失败（${signal || code}）。`));
    });
  });
}

export async function saveUploadedMedia(file: File, collection: "highlights" | "showcase") {
  const media = getUploadedMediaType(file.type);
  if (!media) throw new Error("不支持的媒体格式。");

  const directory = join(process.cwd(), "data", "uploads", collection);
  await mkdir(directory, { recursive: true });
  const id = randomUUID();

  if (media.kind === "image") {
    const filename = `${id}${media.extension}`;
    await pipeline(file.stream(), createWriteStream(join(directory, filename), { flags: "wx" }));
    return { filename, kind: media.kind };
  }

  const workDirectory = await mkdtemp(join(directory, `.transcode-${id}-`));
  const inputPath = join(workDirectory, `input${media.extension}`);
  const outputPath = join(workDirectory, "output.mp4");
  const filename = `${id}.mp4`;

  try {
    await pipeline(file.stream(), createWriteStream(inputPath, { flags: "wx" }));
    await transcodeToH264(inputPath, outputPath);
    if ((await stat(outputPath)).size === 0) throw new Error("FFmpeg 输出了空文件。");
    await rename(outputPath, join(directory, filename));
    return { filename, kind: media.kind };
  } finally {
    await rm(workDirectory, { recursive: true, force: true });
  }
}
