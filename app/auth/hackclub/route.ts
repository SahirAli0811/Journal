import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.HACKCLUB_CLIENT_ID;
  const siteUrl = process.env.SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  if (!clientId || !siteUrl) {
    return NextResponse.json(
      { error: "Missing Hack Club configuration" },
      { status: 500 }
    );
  }

  const redirectUri = `${siteUrl.replace(/\/$/, "")}/auth/hackclub/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",

    scope: "openid profile email name slack_id",
  });

  return NextResponse.redirect(
    `https://auth.hackclub.com/oauth/authorize?${params.toString()}`
  );
}