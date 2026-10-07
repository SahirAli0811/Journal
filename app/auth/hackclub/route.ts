import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.HACKCLUB_CLIENT_ID;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!clientId || !siteUrl) {
    return NextResponse.json(
      { error: "Missing Hack Club configuration" },
      { status: 500 }
    );
  }

  const redirectUri = `${siteUrl}/auth/hackclub/callback`;

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