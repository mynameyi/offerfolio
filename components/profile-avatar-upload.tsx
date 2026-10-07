"use client";

import { useRef, useState, type ChangeEvent } from "react";

type UploadResult = { url?: string; error?: string };

export function ProfileAvatarUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
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
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "头像上传失败，请重试。");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="profile-avatar-upload">
      {value ? <img src={value} alt="当前头像预览" /> : <div className="profile-avatar-placeholder">尚未上传头像</div>}
      <div className="profile-avatar-upload-actions">
        <label className="button button-quiet profile-avatar-upload-button">
          {busy ? "正在上传…" : value ? "更换头像" : "上传头像"}
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={upload} disabled={busy} />
        </label>
        <small>支持 JPG、PNG、WebP、GIF、AVIF</small>
        {error ? <span className="form-error" role="alert">{error}</span> : null}
      </div>
    </div>
  );
}
