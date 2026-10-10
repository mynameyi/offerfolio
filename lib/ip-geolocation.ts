import "server-only";

import { isIP } from "node:net";
import { db } from "@/lib/db";

type IpLocation = {
  country: string;
  region: string;
  city: string;
  district: string;
  isp: string;
};

type CachedIpLocation = IpLocation & {
  status: "pending" | "success" | "failed";
  updatedAt: string;
};

const inFlightLookups = new Set<string>();
const retryAfterMs = 6 * 60 * 60 * 1000;
const stalePendingMs = 5 * 60 * 1000;

function isPublicIpv4(ip: string): boolean {
  const [first, second, third] = ip.split(".").map(Number);
  if (first === 0 || first === 10 || first === 127 || first >= 224) return false;
  if (first === 169 && second === 254) return false;
  if (first === 172 && second >= 16 && second <= 31) return false;
  if (first === 192 && second === 168) return false;
  if (first === 100 && second >= 64 && second <= 127) return false;
  if (first === 192 && second === 0 && (third === 0 || third === 2)) return false;
  if (first === 192 && second === 88 && third === 99) return false;
  if (first === 198 && (second === 18 || second === 19)) return false;
  if (first === 198 && second === 51 && third === 100) return false;
  if (first === 203 && second === 0 && third === 113) return false;
  return true;
}

function ipv6Words(ip: string): number[] {
  const normalized = ip.toLowerCase().split("%")[0];
  const doubleColon = normalized.indexOf("::");
  const left = (doubleColon >= 0 ? normalized.slice(0, doubleColon) : normalized).split(":").filter(Boolean);
  const right = doubleColon >= 0 ? normalized.slice(doubleColon + 2).split(":").filter(Boolean) : [];
  const words = [...left.map((part) => Number.parseInt(part, 16)), ...Array(Math.max(0, 8 - left.length - right.length)).fill(0), ...right.map((part) => Number.parseInt(part, 16))];
  return words.length === 8 ? words : [];
}

export function isPublicIpAddress(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPublicIpv4(ip);
  if (version !== 6) return false;

  const words = ipv6Words(ip);
  if (words.length !== 8) return false;
  if (words.every((word) => word === 0) || (words.slice(0, 7).every((word) => word === 0) && words[7] === 1)) return false;
  if ((words[0] & 0xfe00) === 0xfc00) return false;
  if ((words[0] & 0xffc0) === 0xfe80) return false;
  if ((words[0] & 0xff00) === 0xff00) return false;
  if (words[0] === 0x2001 && words[1] === 0x0db8) return false;

  if (words.slice(0, 5).every((word) => word === 0) && words[5] === 0xffff) {
    const mappedIpv4 = `${words[6] >> 8}.${words[6] & 255}.${words[7] >> 8}.${words[7] & 255}`;
    return isPublicIpv4(mappedIpv4);
  }
  return true;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function hasLocation(location: IpLocation): boolean {
  return Boolean(location.country || location.region || location.city || location.district);
}

function parseIpWhoIsResponse(body: string): IpLocation | null {
  try {
    const response = JSON.parse(body) as {
      success?: boolean;
      country?: unknown;
      region?: unknown;
      city?: unknown;
      connection?: { isp?: unknown };
    };
    if (!response.success) return null;
    const location = {
      country: stringValue(response.country),
      region: stringValue(response.region),
      city: stringValue(response.city),
      district: "",
      isp: stringValue(response.connection?.isp),
    };
    return hasLocation(location) ? location : null;
  } catch {
    return null;
  }
}

function parseIpApiResponse(body: string): IpLocation | null {
  try {
    const response = JSON.parse(body) as {
      status?: string;
      country?: unknown;
      regionName?: unknown;
      city?: unknown;
      district?: unknown;
      isp?: unknown;
    };
    if (response.status !== "success") return null;
    const location = {
      country: stringValue(response.country),
      region: stringValue(response.regionName),
      city: stringValue(response.city),
      district: stringValue(response.district),
      isp: stringValue(response.isp),
    };
    return hasLocation(location) ? location : null;
  } catch {
    return null;
  }
}

function cachedLocation(ip: string): CachedIpLocation | undefined {
  return db.prepare(`
    SELECT status, country, region, city, district, isp, updated_at AS updatedAt
    FROM visitor_ip_geolocations WHERE ip_address = ?
  `).get(ip) as CachedIpLocation | undefined;
}

async function fetchLocation(url: URL, parse: (body: string) => IpLocation | null): Promise<IpLocation | null> {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    return parse(await response.text());
  } catch {
    return null;
  }
}

async function lookupIpWhoIs(ip: string): Promise<IpLocation | null> {
  const url = new URL(`https://ipwho.is/${encodeURIComponent(ip)}`);
  url.searchParams.set("lang", "zh-CN");
  url.searchParams.set("fields", "success,country,region,city,connection.isp");
  return fetchLocation(url, parseIpWhoIsResponse);
}

async function lookupIpApi(ip: string): Promise<IpLocation | null> {
  const url = new URL(`http://ip-api.com/json/${encodeURIComponent(ip)}`);
  url.searchParams.set("fields", "status,country,regionName,city,district,isp");
  url.searchParams.set("lang", "zh-CN");
  return fetchLocation(url, parseIpApiResponse);
}

async function lookupLocation(ip: string): Promise<IpLocation | null> {
  const primary = await lookupIpWhoIs(ip);
  if (primary) return primary;
  return lookupIpApi(ip);
}

export function scheduleIpGeolocationLookup(ip: string): void {
  if (!isPublicIpAddress(ip) || inFlightLookups.has(ip)) return;

  const existing = cachedLocation(ip);
  if (existing?.status === "success") return;
  const updatedAt = existing ? Date.parse(existing.updatedAt) : 0;
  const age = Number.isFinite(updatedAt) ? Date.now() - updatedAt : Number.POSITIVE_INFINITY;
  if (existing?.status === "pending" && age < stalePendingMs) return;
  if (existing?.status === "failed" && age < retryAfterMs) return;

  db.prepare(`
    INSERT INTO visitor_ip_geolocations (ip_address, status, updated_at)
    VALUES (?, 'pending', ?)
    ON CONFLICT(ip_address) DO UPDATE SET
      status = 'pending', country = '', region = '', city = '', district = '', isp = '', updated_at = excluded.updated_at
  `).run(ip, new Date().toISOString());

  inFlightLookups.add(ip);
  void lookupLocation(ip)
    .then((location) => {
      if (!location) {
        db.prepare("UPDATE visitor_ip_geolocations SET status = 'failed', updated_at = ? WHERE ip_address = ?")
          .run(new Date().toISOString(), ip);
        return;
      }
      db.prepare(`
        UPDATE visitor_ip_geolocations
        SET status = 'success', country = ?, region = ?, city = ?, district = ?, isp = ?, updated_at = ?
        WHERE ip_address = ?
      `).run(location.country, location.region, location.city, location.district, location.isp, new Date().toISOString(), ip);
    })
    .catch(() => {
      db.prepare("UPDATE visitor_ip_geolocations SET status = 'failed', updated_at = ? WHERE ip_address = ?")
        .run(new Date().toISOString(), ip);
    })
    .finally(() => inFlightLookups.delete(ip));
}
