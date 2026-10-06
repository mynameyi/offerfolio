import type { Metadata } from "next";
import Link from "next/link";
import { AdminEditor } from "@/components/admin-editor";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "档案管理 · OfferFolio",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <Link className="brand" href="/">
          <span className="brand-mark">O<span>.</span></span>
          <span className="brand-copy"><strong>OfferFolio</strong><small>求职橱窗</small></span>
        </Link>
        <Link className="admin-back-link" href="/">返回公开档案 <span aria-hidden="true">↗</span></Link>
      </header>
      <AdminEditor />
      <footer className="admin-footer">EckyStudio · 你的档案数据保存在本机数据库中</footer>
    </main>
  );
}
