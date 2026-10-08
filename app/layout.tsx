import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { readProfile } from "@/lib/db";
import "./globals.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const profile = await readProfile();
  return {
    title: "OfferFolio · 求职橱窗",
    description: "把简历发出去，不再石沉大海。用清晰的经历与真实证据，展示你能做到什么。",
    applicationName: "OfferFolio",
    icons: { icon: "/icon.svg" },
    ...(profile.preventSearchSnapshots
      ? { robots: { index: true, follow: true, noarchive: true, nocache: true } }
      : {}),
  };
}

export const viewport: Viewport = {
  themeColor: "#f5f4ef",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
