import { isIP } from "node:net";
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { addIgnoredVisitorIp, removeIgnoredVisitorIp } from "@/lib/radar";

export const dynamic = "force-dynamic";

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

  const ipAddress = typeof body === "object" && body !== null
    ? (body as Record<string, unknown>).ipAddress
    : undefined;
  if (typeof ipAddress !== "string" || !isIP(ipAddress.trim())) {
    return NextResponse.json({ error: "请输入有效的 IPv4 或 IPv6 地址。" }, { status: 400 });
  }

  try {
    return NextResponse.json(addIgnoredVisitorIp(ipAddress), {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "添加忽略 IP 失败。";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ error: "请先登录管理后台。" }, { status: 401 });
  }

  const ipAddress = new URL(request.url).searchParams.get("ip")?.trim() || "";
  if (!isIP(ipAddress)) {
    return NextResponse.json({ error: "请输入有效的 IPv4 或 IPv6 地址。" }, { status: 400 });
  }
  return NextResponse.json({ removed: removeIgnoredVisitorIp(ipAddress) }, { headers: { "Cache-Control": "no-store" } });
}
