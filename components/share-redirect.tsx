"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function ShareRedirect({ token }: { token: string }) {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    const fallback = window.setTimeout(() => router.replace("/"), 2500);
    fetch(`/api/radar/${token}/visit`, { method: "POST", cache: "no-store" })
      .catch(() => undefined)
      .finally(() => {
        if (!active) return;
        window.clearTimeout(fallback);
        router.replace("/");
      });
    return () => {
      active = false;
      window.clearTimeout(fallback);
    };
  }, [router, token]);

  return <main className="share-redirect" aria-live="polite">正在打开个人展示页…</main>;
}
