"use client";

import { useRef, useState, type ChangeEvent } from "react";

type UploadResult = { url?: string; error?: string };

export function ProfileAvatarUpload({
  value,
  positionX,
  positionY,
  onChange,
  onPositionChange,
}: {
  value: string;
  positionX: number;
  positionY: number;
  onChange: (url: string) => void;
  onPositionChange: (x: number, y: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;

    setBusy(true);
    setError("");
    const formData = new FormData();
    formData.set("file", file);

    try {
      const response = await fetch("/api/admin/profile/avatar", { method: "POST", body: formData });
      const result = await response.json() as UploadResult;
      if (!response.ok || !result.url) throw new Error(result.error || "头像上传失败，请重试。");
      onChange(result.url);
      onPositionChange(50, 0);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "头像上传失败，请重试。");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="profile-avatar-upload">
      {value ? (
        <div className="profile-avatar-crop-preview" role="img" aria-label="圆形头像裁切预览">
          <img src={value} alt="" style={{ objectPosition: `${positionX}% ${positionY}%` }} />
        </div>
      ) : <div className="profile-avatar-placeholder">尚未上传头像</div>}
      <div className="profile-avatar-upload-actions">
        <label className="button button-quiet profile-avatar-upload-button">
          {busy ? "正在上传…" : value ? "更换头像" : "上传头像"}
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={upload} disabled={busy} />
        </label>
        <small>支持 JPG、PNG、WebP、GIF、AVIF</small>
        {value ? (
          <div className="profile-avatar-crop-controls">
            <p>拖动滑块调整圆形头像的取景位置</p>
            <label className="profile-avatar-crop-control">
              <span>水平</span>
              <input type="range" min="0" max="100" value={positionX} onChange={(event) => onPositionChange(Number(event.target.value), positionY)} aria-label="头像水平取景位置" />
              <output>{positionX}%</output>
            </label>
            <label className="profile-avatar-crop-control">
              <span>垂直</span>
              <input type="range" min="0" max="100" value={positionY} onChange={(event) => onPositionChange(positionX, Number(event.target.value))} aria-label="头像垂直取景位置" />
              <output>{positionY}%</output>
            </label>
          </div>
        ) : null}
        {error ? <span className="form-error" role="alert">{error}</span> : null}
      </div>
    </div>
  );
}
