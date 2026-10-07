"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Glyph } from "@/components/glyph";
import { AdminWorkspace } from "@/components/admin-workspace";
import { ADMIN_SESSION_EXPIRED_EVENT } from "@/components/admin-fetch";

type EditorMode = "checking" | "login" | "editing";

async function readJson<T>(response: Response): Promise<T & { error?: string }> {
  return (await response.json()) as T & { error?: string };
}

export function AdminEditor() {
  const [mode, setMode] = useState<EditorMode>("checking");
  const [configured, setConfigured] = useState(true);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/admin/session", { cache: "no-store" })
      .then(readJson<{ authenticated: boolean; configured: boolean }>)
      .then((session) => {
        if (!active) return;
        setConfigured(session.configured);
        setMode(session.authenticated ? "editing" : "login");
      })
      .catch(() => {
        if (!active) return;
        setError("连接服务失败，请稍后刷新页面。");
        setMode("login");
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    function handleSessionExpired() {
      setPassword("");
      setError("");
      setMessage("登录已失效，请重新登录。");
      setMode("login");
    }
    window.addEventListener(ADMIN_SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(ADMIN_SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, []);

  useEffect(() => {
    if (mode !== "editing") return;
    let checking = false;
    async function verifySession() {
      if (checking) return;
      checking = true;
      try {
        const response = await fetch("/api/admin/session", { cache: "no-store" });
        if (!response.ok) return;
        const session = await readJson<{ authenticated: boolean }>(response);
        if (!session.authenticated) window.dispatchEvent(new Event(ADMIN_SESSION_EXPIRED_EVENT));
      } catch {
        // Keep the current workspace open during temporary network errors.
      } finally {
        checking = false;
      }
    }
    const interval = window.setInterval(() => void verifySession(), 20_000);
    const onFocus = () => void verifySession();
    const onVisibilityChange = () => { if (document.visibilityState === "visible") void verifySession(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [mode]);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await readJson<{ ok?: boolean }>(response);
      if (!response.ok) throw new Error(result.error || "登录失败。");
      setPassword("");
      setMode("editing");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "登录失败，请重试。");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setMode("login");
    setMessage("已退出管理后台。");
  }

  if (mode === "checking") {
    return <section className="admin-loading"><span className="loading-spinner" />正在验证管理会话…</section>;
  }

  if (mode === "login") {
    return (
      <section className="login-layout">
        <div className="login-intro">
          <p className="section-kicker">ECKYSTUDIO / OFFERFOLIO</p>
          <h1>让你的经历，<br /><em>说得更清楚。</em></h1>
          <p>在这里调整展示布局、管理内容和查看全部公开页面访问记录。档案保存在本机 SQLite 数据库中。</p>
          <div className="login-proof"><Glyph name="lock" /><span>仅本机管理员可修改档案</span></div>
        </div>
        <form className="login-card" onSubmit={submitLogin}>
          <span className="login-card-mark"><Glyph name="lock" /></span>
          <p className="section-kicker">管理后台</p>
          <h2>欢迎回来</h2>
          <p className="muted-text">输入本地配置的管理密码以继续。</p>
          {!configured ? <div className="notice notice-error">后台尚未启用。请从 .env.example 创建 .env 并设置 ADMIN_PASSWORD。</div> : null}
          <label className="field-label" htmlFor="admin-password">管理密码</label>
          <input id="admin-password" className="field-input" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={!configured} required />
          <button className="button button-dark login-submit" type="submit" disabled={busy || !configured}>{busy ? "正在验证…" : "进入档案管理"}<Glyph name="arrow" /></button>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          {message ? <p className="form-success" role="status">{message}</p> : null}
          <p className="login-footnote">忘记密码？在 .env 中修改 ADMIN_PASSWORD 后重启服务。</p>
        </form>
      </section>
    );
  }

  return <AdminWorkspace onLogout={logout} />;
}
