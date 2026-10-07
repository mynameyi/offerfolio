import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { ShareRedirect } from "@/components/share-redirect";
import { getActiveShareLink, recordVisitorVisit, visitContextFromHeaders } from "@/lib/radar";

export const dynamic = "force-dynamic";

export default async function SharedPortfolioPage({ params, searchParams }: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{16}$/.test(token) || !getActiveShareLink(token)) notFound();
  const query = await searchParams;
  const requestHeaders = await headers();
  const visitKey = recordVisitorVisit(visitContextFromHeaders(requestHeaders, `/r/${token}`, token, {
    source: typeof query.utm_source === "string" ? query.utm_source : "",
    medium: typeof query.utm_medium === "string" ? query.utm_medium : "",
    name: typeof query.utm_campaign === "string" ? query.utm_campaign : "",
  }));
  if (!visitKey) notFound();
  return <ShareRedirect token={token} visitKey={visitKey} />;
}
