import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.HACKATIME_CLIENT_ID;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  if (!clientId || !siteUrl) {
    return NextResponse.json(
      { error: "Missing Hackatime Configuration" },
      { status: 500 }
    );
  }

  const redirectUri = `${siteUrl}/auth/hackatime/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "profile read",
  });

  return NextResponse.redirect(
    `https://hackatime.hackclub.com/oauth/authorize?${params.toString()}`
  );
}