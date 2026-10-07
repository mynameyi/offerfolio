"use client";

export const ADMIN_SESSION_EXPIRED_EVENT = "offerfolio:admin-session-expired";

export async function adminFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init);
  if (response.status === 401 && typeof window !== "undefined") {
    window.dispatchEvent(new Event(ADMIN_SESSION_EXPIRED_EVENT));
  }
  return response;
}
