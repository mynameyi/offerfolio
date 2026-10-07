"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function ShareRedirect({ token }: { token: string }) {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    const fallback = window.setTimeout(() => router.replace("/"), 2500);
    fetch(`/api/radar/${token}/visit`, { method: "POST", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return await response.json() as { visitKey?: string };
      })
      .catch(() => null)
      .then((result) => {
        if (!active) return;
        window.clearTimeout(fallback);
        const query = new URLSearchParams();
        if (result?.visitKey) {
          query.set("of_token", token);
          query.set("of_visit", result.visitKey);
        }
        router.replace(query.size ? `/?${query.toString()}` : "/");
      });
    return () => {
      active = false;
      window.clearTimeout(fallback);
    };
  }, [router, token]);

  return <main className="share-redirect" aria-live="polite">正在打开个人展示页…</main>;
}
