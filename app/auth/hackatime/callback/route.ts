import { NextRequest, NextResponse } from "next/server";

export async function GET(request:NextRequest) {
    const code = request.nextUrl.searchParams.get("code");
    const error = request.nextUrl.searchParams.get("error");

    if (error) {
        return NextResponse.json(
            {
                error: "Hackatime authorization was denied",
                details: error,
            },
            {status: 400}
        );
    }
    if(!code){
        return NextResponse.json(
            {
               error: "No authorization code received",
            },
            {status: 400}
        );
    }
    const clientId = process.env.HACKATIME_CLIENT_ID;
  const clientSecret = process.env.HACKATIME_CLIENT_SECRET;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!clientId || !clientSecret || !siteUrl) {
    return new NextResponse(
      "Missing Hackatime environment variables",
      { status: 500 }
    );
  }

  const redirectUri = `${siteUrl}/auth/hackatime/callback`;

  const response = await fetch(
    "https://hackatime.hackclub.com/oauth/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    }
  );

  const tokenData = await response.json();

  if (!response.ok) {
    return NextResponse.json(
      {
        error: "Failed to exchange Hackatime code",
        details: tokenData,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "Hackatime authorization successful!",
    token_received: !!tokenData.access_token,
  });
}