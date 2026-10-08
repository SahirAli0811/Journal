import { NextRequest, NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/url";

export async function GET(request: NextRequest) {
  const clientId = process.env.HACKATIME_CLIENT_ID;
  const siteUrl = getSiteUrl(request);

  if (!clientId || !siteUrl) {
    return NextResponse.json(
      { error: "Missing Hackatime Configuration" },
      { status: 500 }
    );
  }

  // Preserve userId from query param or session cookie
  const userId =
    request.nextUrl.searchParams.get("userId") ||
    request.cookies.get("journal_user_id")?.value;

  const redirectUri = `${siteUrl}/auth/hackatime/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "profile read",
    ...(userId ? { state: userId } : {}),
  });

  return NextResponse.redirect(
    `https://hackatime.hackclub.com/oauth/authorize?${params.toString()}`
  );
}