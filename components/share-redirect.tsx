"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function ShareRedirect({ token, visitKey }: { token: string; visitKey: string }) {
  const router = useRouter();

  useEffect(() => {
    const query = new URLSearchParams({ of_token: token, of_visit: visitKey });
    router.replace(`/?${query.toString()}`);
  }, [router, token, visitKey]);

  return <main className="share-redirect" aria-live="polite">正在打开个人展示页…</main>;
}
