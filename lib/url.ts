import { NextRequest } from "next/server";

export function getSiteUrl(request?: NextRequest | Request): string {

  const explicit = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit && explicit.trim()) {
    return explicit.trim().replace(/\/+$/, "");
  }

  if (request) {
    const host =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host");

    if (host) {
      if (host.includes("localhost") || host.includes("127.0.0.1")) {
        return `http://${host}`.replace(/\/+$/, "");
      }
      if (host.includes("journal-beta-three.vercel.app")) {
        return "https://journal-beta-three.vercel.app";
      }
    }
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`.replace(/\/+$/, "");
  }
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    return "https://journal-beta-three.vercel.app";
  }

  return "http://localhost:3000";
}
