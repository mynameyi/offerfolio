import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

type RepositoryHost = "github" | "gitee";

function parseRepositoryUrl(value: unknown): { host: RepositoryHost; owner: string; repository: string } | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.search || url.hash) return null;
  const host: RepositoryHost | null = hostname === "github.com" ? "github" : hostname === "gitee.com" ? "gitee" : null;
  if (!host) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length !== 2) return null;
  let [owner, repository] = parts;
  try {
    owner = decodeURIComponent(owner);
    repository = decodeURIComponent(repository).replace(/\.git$/i, "");
  } catch {
    return null;
  }
  if (!/^[A-Za-z0-9_.-]{1,100}$/.test(owner) || !/^[A-Za-z0-9_.-]{1,100}$/.test(repository)) return null;
  return { host, owner, repository };
}

function plainText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function numberValue(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null;
}

function topicList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((topic) => {
    if (typeof topic === "string") return topic.trim();
    if (typeof topic === "object" && topic !== null && "name" in topic) {
      const name = (topic as { name?: unknown }).name;
      return typeof name === "string" ? name.trim() : "";
    }
    return "";
  }).filter(Boolean).slice(0, 12).map((topic) => topic.slice(0, 80));
}

export async function POST(request: Request) {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ error: "请先登录管理后台。" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求内容不是有效的 JSON。" }, { status: 400 });
  }
  const urlValue = typeof body === "object" && body !== null && "url" in body
    ? (body as { url?: unknown }).url
    : undefined;
  const repository = parseRepositoryUrl(urlValue);
  if (!repository) {
    return NextResponse.json({ error: "请输入 GitHub 或 Gitee 上的公开仓库链接。" }, { status: 400 });
  }

  const apiUrl = repository.host === "github"
    ? `https://api.github.com/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repository)}`
    : `https://gitee.com/api/v5/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repository)}`;
  try {
    const response = await fetch(apiUrl, {
      headers: {
        Accept: "application/vnd.github+json, application/json",
        "User-Agent": "OfferFolio repository metadata reader",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      const message = response.status === 404
        ? "仓库不存在、不是公开仓库，或链接格式不正确。"
        : response.status === 403 || response.status === 429
          ? "仓库平台暂时限制了读取请求，请稍后重试。"
          : "仓库平台暂时无法读取该仓库信息。";
      return NextResponse.json({ error: message }, { status: response.status === 404 ? 404 : 502 });
    }

    const data = await response.json() as Record<string, unknown>;
    const metadata = {
      title: plainText(data.name, 140) || repository.repository,
      summary: plainText(data.description, 1200),
      language: plainText(data.language, 80),
      tags: topicList(repository.host === "github" ? data.topics : data.project_labels),
      stars: numberValue(repository.host === "github" ? data.stargazers_count : data.stargazers_count),
      forks: numberValue(data.forks_count),
    };
    return NextResponse.json({ metadata }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === "TimeoutError";
    return NextResponse.json({ error: isTimeout ? "读取仓库信息超时，请稍后重试。" : "无法连接仓库平台，请稍后重试。" }, { status: 502 });
  }
}
