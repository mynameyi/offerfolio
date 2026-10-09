import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { lstat, readFile, readdir } from "node:fs/promises";
import { basename, extname, join, relative, resolve, sep } from "node:path";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { ADMIN_COOKIE_NAME } from "@/lib/admin-session";
import { readProfile } from "@/lib/db";
import { showcaseMediaItems } from "@/lib/profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ZipEntry = { name: string; data: Buffer };
type ExportMedia = { id: string; url: string; kind: "image" | "video" };
type GalleryEntry = {
  title: string;
  summary: string;
  period?: string;
  imageUrl?: string;
  embedUrl?: string;
  showcaseCoverUrl?: string;
  mediaItems?: ExportMedia[];
};

const mediaCollections = new Set(["avatars", "highlights", "showcase", "achievements", "education"]);
const clientScript = String.raw`
(() => {
  const root = document.querySelector('.developerfolio-site');
  if (!root) return;
  const dataNode = document.getElementById('offerfolio-static-data');
  let data = { highlights: [], showcase: [], achievements: [] };
  try { if (dataNode) data = JSON.parse(dataNode.textContent || '{}'); } catch (_) {}

  const closeOverlay = (overlay) => {
    if (!overlay) return;
    overlay.remove();
    document.body.style.overflow = '';
  };
  const selectExperience = (index) => {
    const tabs = Array.from(root.querySelectorAll('[data-export-experience-index]'));
    const panels = Array.from(root.querySelectorAll('[data-export-experience-panel]'));
    if (!tabs.length || !panels.length || index < 0 || index >= panels.length) return;
    tabs.forEach((tab, tabIndex) => {
      const selected = tabIndex === index;
      tab.classList.toggle('is-active', selected);
      tab.setAttribute('aria-pressed', String(selected));
    });
    panels.forEach((panel, panelIndex) => { panel.hidden = panelIndex !== index; });
  };
  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  const openMedia = (entry, type) => {
    const overlay = make('div', 'df-highlight-modal-backdrop' + (type === 'showcase' ? ' df-showcase-modal-backdrop' : ''));
    overlay.setAttribute('role', 'presentation');
    let modal;
    let media;
    if (type === 'showcase') {
      modal = make('section', 'df-highlight-modal df-showcase-modal');
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-label', '项目展示详情');
      const items = entry.mediaItems || [];
      media = make('div', 'df-showcase-modal-media-grid' + (items.length === 1 ? ' is-single' : ''));
      items.forEach((item, index) => {
        const frame = make('div', 'df-showcase-modal-media');
        const isVideo = item.kind === 'video' || /\.(mp4|webm|ogg|ogv|mov|m4v)(?:[?#].*)?$/i.test(item.url);
        const visual = document.createElement(isVideo ? 'video' : 'img');
        visual.src = item.url;
        if (isVideo) { visual.controls = true; visual.playsInline = true; visual.preload = 'metadata'; visual.setAttribute('aria-label', '项目视频 ' + (index + 1)); }
        else { visual.alt = '项目展示素材 ' + (index + 1); visual.loading = 'lazy'; }
        frame.append(visual);
        media.append(frame);
      });
    } else {
      modal = make('section', 'df-highlight-modal df-highlight-modal-unobstructed');
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-label', '高光时刻详情');
      media = make('div', 'df-highlight-modal-media');
      const source = entry.embedUrl || entry.imageUrl;
      if (source && entry.embedUrl && !/\.(mp4|webm|ogg|ogv|mov|m4v)(?:[?#].*)?$/i.test(entry.embedUrl)) {
        const frame = document.createElement('iframe');
        frame.src = source; frame.title = entry.title || '高光时刻视频';
        frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        frame.allowFullscreen = true; media.append(frame);
      } else if (source) {
        const visual = document.createElement(entry.embedUrl ? 'video' : 'img');
        visual.src = source;
        if (entry.embedUrl) { visual.controls = true; visual.playsInline = true; if (entry.imageUrl) visual.poster = entry.imageUrl; }
        else visual.alt = entry.title || '';
        media.append(visual);
      }
    }
    const close = make('button', 'df-highlight-modal-close', '×');
    close.type = 'button'; close.setAttribute('aria-label', '关闭');
    close.addEventListener('click', () => closeOverlay(overlay));
    modal.append(close, media);
    const copy = make('div', 'df-highlight-modal-copy' + (type === 'showcase' ? ' df-showcase-modal-copy' : ''));
    if (type === 'showcase') {
      const text = make('p', '', entry.summary || entry.title || '');
      copy.append(text);
    } else {
      if (entry.period) copy.append(make('span', 'df-highlight-modal-date', entry.period));
      if (entry.summary) copy.append(make('p', '', entry.summary));
    }
    modal.append(copy);
    overlay.append(modal);
    overlay.addEventListener('mousedown', (event) => { if (event.target === overlay) closeOverlay(overlay); });
    document.body.append(overlay);
    document.body.style.overflow = 'hidden';
    close.focus();
  };

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const experienceTab = target.closest('[data-export-experience-index]');
    if (experienceTab) { selectExperience(Number(experienceTab.dataset.exportExperienceIndex)); return; }
    const experienceStep = target.closest('[data-export-experience-step]');
    if (experienceStep) {
      const panel = experienceStep.closest('[data-export-experience-panel]');
      if (panel) selectExperience(Number(panel.dataset.exportExperiencePanel) + Number(experienceStep.dataset.exportExperienceStep));
      return;
    }
    const highlight = target.closest('[data-export-highlight-index]');
    const showcase = target.closest('[data-export-showcase-index]');
    const award = target.closest('.df-achievement-image-button');
    if (highlight) { const entry = data.highlights[Number(highlight.dataset.exportHighlightIndex)]; if (entry) openMedia(entry, 'highlight'); return; }
    if (showcase) { const entry = data.showcase[Number(showcase.dataset.exportShowcaseIndex)]; if (entry) openMedia(entry, 'showcase'); return; }
    if (award) {
      const entry = data.achievements[Number(award.dataset.exportAchievementIndex)];
      if (!entry || !entry.imageUrl) return;
      const overlay = make('div', 'df-achievement-lightbox-backdrop'); overlay.setAttribute('role', 'presentation');
      const figure = make('figure', 'df-achievement-lightbox'); figure.setAttribute('role', 'dialog'); figure.setAttribute('aria-modal', 'true');
      const close = make('button', 'df-achievement-lightbox-close', '×'); close.type = 'button'; close.setAttribute('aria-label', '关闭图片');
      close.addEventListener('click', () => closeOverlay(overlay));
      const image = document.createElement('img'); image.src = entry.imageUrl; image.alt = entry.title || '';
      const caption = make('figcaption');
      if (entry.period) caption.append(make('span', '', entry.period));
      if (entry.title) caption.append(make('strong', '', entry.title));
      if (entry.summary) caption.append(make('p', '', entry.summary));
      figure.append(close, image, caption); overlay.append(figure);
      overlay.addEventListener('mousedown', (mouseEvent) => { if (mouseEvent.target === overlay) closeOverlay(overlay); });
      document.body.append(overlay); document.body.style.overflow = 'hidden'; close.focus();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeOverlay(document.querySelector('.df-highlight-modal-backdrop, .df-achievement-lightbox-backdrop'));
  });

  const themeButtons = root.querySelectorAll('.df-theme-toggle');
  const applyTheme = (theme) => {
    root.dataset.theme = theme;
    themeButtons.forEach((button) => {
      const icon = button.querySelector('span');
      if (icon) icon.textContent = theme === 'dark' ? '☼' : '☾';
      button.setAttribute('aria-label', theme === 'dark' ? '切换为浅色模式' : '切换为深色模式');
    });
  };
  let theme = 'light';
  try { const saved = localStorage.getItem('offerfolio-theme'); if (saved === 'dark' || saved === 'light') theme = saved; else if (matchMedia('(prefers-color-scheme: dark)').matches) theme = 'dark'; } catch (_) {}
  applyTheme(theme);
  themeButtons.forEach((button) => button.addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('offerfolio-theme', theme); } catch (_) {}
    applyTheme(theme);
  }));

  const links = Array.from(root.querySelectorAll('.df-nav > a'));
  const nav = root.querySelector('.df-nav');
  const indicator = root.querySelector('.df-nav-active-indicator');
  const updateActive = () => {
    if (!links.length) return;
    const marker = Math.max((root.querySelector('.df-header')?.getBoundingClientRect().bottom || 0) + 12, Math.min(innerHeight * .38, (root.querySelector('.df-header')?.getBoundingClientRect().bottom || 0) + 180));
    let active = links[0];
    links.forEach((link) => { const section = document.getElementById((link.getAttribute('href') || '').slice(1)); if (section && section.getBoundingClientRect().top <= marker) active = link; });
    links.forEach((link) => { const selected = link === active; link.classList.toggle('is-active', selected); if (selected) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current'); });
    if (indicator && nav && active) { indicator.style.width = active.offsetWidth + 'px'; indicator.style.transform = 'translateX(' + active.offsetLeft + 'px)'; const left = active.offsetLeft; if (left < nav.scrollLeft || left + active.offsetWidth > nav.scrollLeft + nav.clientWidth) nav.scrollTo({ left: left - (nav.clientWidth - active.offsetWidth) / 2, behavior: 'smooth' }); }
  };
  let frame = 0;
  const scheduleActive = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(updateActive); };
  updateActive(); addEventListener('scroll', scheduleActive, { passive: true }); addEventListener('resize', scheduleActive);
  root.querySelectorAll('.df-mobile-menu nav a[href^="#"]').forEach((link) => link.addEventListener('click', () => { const details = link.closest('details'); if (details) details.open = false; }));
})();
`;

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function decodeHtmlAttribute(value: string): string {
  return value.replaceAll("&amp;", "&").replaceAll("&#x27;", "'").replaceAll("&#39;", "'").replaceAll("&quot;", '"');
}

async function listFiles(directory: string): Promise<string[]> {
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); } catch { return []; }
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()): { date: number; time: number } {
  return {
    date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
  };
}

function makeZip(entries: ZipEntry[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  const { date, time } = dosDateTime();
  for (const entry of entries) {
    const name = Buffer.from(entry.name.replaceAll("\\", "/"), "utf8");
    const checksum = crc32(entry.data);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x0800, 6);
    header.writeUInt16LE(0, 8);
    header.writeUInt16LE(time, 10);
    header.writeUInt16LE(date, 12);
    header.writeUInt32LE(checksum, 14);
    header.writeUInt32LE(entry.data.length, 18);
    header.writeUInt32LE(entry.data.length, 22);
    header.writeUInt16LE(name.length, 26);
    header.writeUInt16LE(0, 28);
    localParts.push(header, name, entry.data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(entry.data.length, 20);
    central.writeUInt32LE(entry.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);
    offset += header.length + name.length + entry.data.length;
    if (offset > 0xffffffff) throw new Error("静态资源包超过 ZIP32 的 4 GB 上限。");
  }
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, ...centralParts, end]);
}

export async function GET(request: Request) {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ error: "请先登录管理后台。" }, { status: 401 });
  }

  try {
    const internalOrigin = process.env.OFFERFOLIO_INTERNAL_ORIGIN || `http://127.0.0.1:${process.env.PORT || "3000"}`;
    const cookieStore = await cookies();
    const adminCookie = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    if (!adminCookie) return NextResponse.json({ error: "管理登录已失效，请重新登录。" }, { status: 401 });
    const rendered = await fetch(new URL("/?__of_static_snapshot=1", internalOrigin), {
      headers: { cookie: `${ADMIN_COOKIE_NAME}=${adminCookie}` },
      cache: "no-store",
      signal: AbortSignal.timeout(60_000),
    });
    if (!rendered.ok) throw new Error(`读取公开页面失败（HTTP ${rendered.status}）。`);
    const page = await rendered.text();
    const match = page.match(/<main\b[^>]*class="[^"]*\bdeveloperfolio-site\b[^"]*"[^>]*>[\s\S]*?<\/main>/i);
    if (!match) throw new Error("没有找到公开页面的静态内容，请确认应用已完成构建。");

    const profile = readProfile();
    const assets = new Map<string, Buffer>();
    const dataRoot = join(process.cwd(), "data", "uploads");
    const publicRoot = resolve(process.cwd(), "public");
    const internalUrl = (value: string) => new URL(value, internalOrigin);
    const faviconPath = join(publicRoot, "icon.svg");
    if (await lstat(faviconPath).then((info) => info.isFile()).catch(() => false)) {
      assets.set("assets/public/icon.svg", await readFile(faviconPath));
    }

    const packageMedia = async (source: string): Promise<string> => {
      const cleanSource = decodeHtmlAttribute(source).trim();
      if (!cleanSource || cleanSource.startsWith("data:") || cleanSource.startsWith("blob:")) return cleanSource;
      let url: URL;
      try { url = internalUrl(cleanSource); } catch { return cleanSource; }
      if (url.pathname === "/_next/image") {
        const original = url.searchParams.get("url");
        if (!original) return cleanSource;
        return packageMedia(original);
      }
      if (url.origin !== new URL(internalOrigin).origin) return cleanSource;
      const segments = url.pathname.split("/").filter(Boolean).map((segment) => decodeURIComponent(segment));
      let filePath = "";
      let archivePath = "";
      if (segments[0] === "api" && segments[1] === "media" && mediaCollections.has(segments[2] ?? "") && segments[3]) {
        const filename = segments[3];
        if (basename(filename) !== filename || filename.includes("\\") || filename === "." || filename === "..") {
          throw new Error("导出媒体资源时遇到无效文件路径。");
        }
        filePath = join(dataRoot, segments[2], filename);
        archivePath = `assets/media/${segments[2]}/${filename}`;
      } else if (url.pathname.startsWith("/")) {
        const relativePublicPath = segments.join(sep);
        const candidate = resolve(publicRoot, relativePublicPath);
        const rel = relative(publicRoot, candidate);
        if (!rel || rel.startsWith(`..${sep}`) || rel === ".." || rel.startsWith(sep)) return cleanSource;
        const info = await lstat(candidate).catch(() => null);
        if (!info?.isFile()) return cleanSource;
        filePath = candidate;
        archivePath = `assets/public/${rel.split(sep).join("/")}`;
      }
      if (!filePath) return cleanSource;
      let content = assets.get(archivePath);
      if (!content) {
        try { content = await readFile(filePath); }
        catch { throw new Error(`静态导出缺少媒体文件：${segments.at(-1) || filePath}`); }
        assets.set(archivePath, content);
      }
      return archivePath;
    };

    const rewriteStoredUrl = async (source: string): Promise<string> => {
      const packaged = await packageMedia(source);
      return packaged === source ? source : packaged;
    };
    const highlights: GalleryEntry[] = profile.metrics
      .filter((item) => item.imageUrl || item.embedUrl)
      .map((item) => ({ title: item.title, summary: item.summary, period: item.period, imageUrl: item.imageUrl, embedUrl: item.embedUrl }));
    const showcase: GalleryEntry[] = profile.showcaseItems
      .filter((item) => (item.showcaseType ?? (showcaseMediaItems(item).length ? "company-project" : "open-source")) === "company-project")
      .filter((item) => showcaseMediaItems(item).length > 0 && Boolean(item.summary || item.title))
      .map((item) => ({
        title: item.title,
        summary: item.summary,
        showcaseCoverUrl: item.showcaseCoverUrl,
        mediaItems: showcaseMediaItems(item),
      }));
    const achievements: GalleryEntry[] = profile.achievements
      .filter((item) => Boolean(item.imageUrl))
      .map((item) => ({ title: item.title, summary: item.summary, period: item.period, imageUrl: item.imageUrl }));

    for (const entry of highlights) {
      if (entry.imageUrl) entry.imageUrl = await rewriteStoredUrl(entry.imageUrl);
      if (entry.embedUrl) entry.embedUrl = await rewriteStoredUrl(entry.embedUrl);
    }
    for (const entry of showcase) {
      if (entry.showcaseCoverUrl) entry.showcaseCoverUrl = await rewriteStoredUrl(entry.showcaseCoverUrl);
      for (const item of entry.mediaItems ?? []) item.url = await rewriteStoredUrl(item.url);
    }
    for (const entry of achievements) if (entry.imageUrl) entry.imageUrl = await rewriteStoredUrl(entry.imageUrl);

    let staticMain = match[0]
      .replace(/\s+srcset="[^"]*"/gi, "")
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
    const sourceAttributes = Array.from(staticMain.matchAll(/\b(src|poster)="([^"]*)"/gi));
    for (const found of sourceAttributes) {
      const whole = found[0];
      const attribute = found[1];
      const original = decodeHtmlAttribute(found[2]);
      const target = await packageMedia(original);
      if (target !== original) staticMain = staticMain.replace(whole, `${attribute}="${escapeHtml(target)}"`);
    }
    staticMain = staticMain.replace(/<button\b(?=[^>]*class="df-highlight-card")/g, (tag, offset: number) => {
      const before = staticMain.slice(0, offset);
      const index = (before.match(/<button\b(?=[^>]*class="df-highlight-card")/g) ?? []).length;
      return tag.replace(/>$/, ` data-export-highlight-index="${index}">`);
    });
    staticMain = staticMain.replace(/<button\b(?=[^>]*class="df-showcase-card df-showcase-company-card")/g, (tag, offset: number) => {
      const before = staticMain.slice(0, offset);
      const index = (before.match(/<button\b(?=[^>]*class="df-showcase-card df-showcase-company-card")/g) ?? []).length;
      return tag.replace(/>$/, ` data-export-showcase-index="${index}">`);
    });
    staticMain = staticMain.replace(/<button\b(?=[^>]*class="df-achievement-image-button")/g, (tag, offset: number) => {
      const before = staticMain.slice(0, offset);
      const index = (before.match(/<button\b(?=[^>]*class="df-achievement-image-button")/g) ?? []).length;
      return tag.replace(/>$/, ` data-export-achievement-index="${index}">`);
    });
    staticMain = staticMain.replace(/href="\/"/g, 'href="./index.html"');

    const cssFiles = (await listFiles(join(process.cwd(), ".next", "static"))).filter((file) => extname(file).toLowerCase() === ".css");
    if (!cssFiles.length) throw new Error("未找到公开页样式，请先构建应用。");
    const css = (await Promise.all(cssFiles.map((file) => readFile(file, "utf8")))).join("\n");
    const robots = profile.preventSearchSnapshots
      ? "User-agent: *\nDisallow: /\n"
      : "User-agent: *\nAllow: /\n";
    const title = `${profile.displayName} · 个人作品集`;
    const document = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark">${profile.preventSearchSnapshots ? '<meta name="robots" content="noindex, nofollow, noarchive, nocache">' : ""}<title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(profile.introduction.slice(0, 300))}"><link rel="icon" href="assets/public/icon.svg"><link rel="stylesheet" href="assets/site.css"></head><body>${staticMain}<script id="offerfolio-static-data" type="application/json">${JSON.stringify({ highlights, showcase, achievements }).replaceAll("<", "\\u003c")}</script><script src="assets/site.js" defer></script></body></html>`;
    const staticReadme = [
      "# OfferFolio 静态页面",
      "",
      "1. 将 `index.html`、`robots.txt` 和 `assets/` 保持原有结构，上传到静态托管服务的网站根目录。",
      "2. GitHub Pages：在仓库 **Settings → Pages** 中选择发布分支和目录，再将这些文件提交到对应目录。项目仓库 Pages（`用户名.github.io/仓库名/`）可直接使用包内的相对资源路径。",
      "",
      "此静态副本不连接 OfferFolio 服务器，不记录访客、模块停留或投递来源，也不能在网页中编辑内容。修改档案后，请先在后台保存，再重新导出并上传。导出包包含公开档案及引用的图片、视频；访问托管站点的人可以查看或下载这些文件，发布前请确认内容适合公开。",
      "",
      "`robots.txt` 与页面的 `noindex` 元数据按导出时“减少搜索引擎留痕”开关生成。这些规则只是对爬虫的请求，不是访问控制。求职展示结束后，请从静态托管平台删除发布文件。",
      "",
    ].join("\n");

    const entries: ZipEntry[] = [
      { name: "index.html", data: Buffer.from(document, "utf8") },
      { name: "robots.txt", data: Buffer.from(robots, "utf8") },
      { name: "assets/site.css", data: Buffer.from(css, "utf8") },
      { name: "assets/site.js", data: Buffer.from(clientScript, "utf8") },
      { name: "README.md", data: Buffer.from(staticReadme, "utf8") },
      ...Array.from(assets, ([name, data]) => ({ name, data })),
    ];
    const zip = makeZip(entries);
    return new Response(new Uint8Array(zip), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="offerfolio-static.zip"',
        "Content-Length": String(zip.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "静态页面导出失败。";
    return NextResponse.json({ error: message }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
