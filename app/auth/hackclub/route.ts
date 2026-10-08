import { NextRequest, NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/url";

export async function GET(request: NextRequest) {
  const clientId = process.env.HACKCLUB_CLIENT_ID;
  const siteUrl = getSiteUrl(request);

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