import type { MetadataRoute } from "next";
import { readProfile } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const discourageSearchEngines = readProfile().preventSearchSnapshots;

  return {
    rules: {
      userAgent: "*",
      ...(discourageSearchEngines ? { disallow: "/" } : { allow: "/" }),
    },
  };
}
