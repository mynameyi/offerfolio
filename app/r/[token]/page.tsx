import { notFound } from "next/navigation";
import { ShareRedirect } from "@/components/share-redirect";
import { getActiveShareLink } from "@/lib/radar";

export const dynamic = "force-dynamic";

export default async function SharedPortfolioPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{16}$/.test(token) || !getActiveShareLink(token)) notFound();
  return <ShareRedirect token={token} />;
}
