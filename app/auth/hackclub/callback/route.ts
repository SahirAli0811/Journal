import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.json(
      {
        error: "Hack Club authorization was denied",
        details: error,
      },
      { status: 400 }
    );
  }

  if (!code) {
    return NextResponse.json(
      {
        error: "No Hack Club authorization code received",
      },
      { status: 400 }
    );
  }

  const clientId = process.env.HACKCLUB_CLIENT_ID;
  const clientSecret = process.env.HACKCLUB_CLIENT_SECRET;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!clientId || !clientSecret || !siteUrl) {
    return NextResponse.json(
      {
        error: "Missing Hack Club configuration",
      },
      { status: 500 }
    );
  }

  const redirectUri = `${siteUrl}/auth/hackclub/callback`;

  try {
    const tokenResponse = await fetch(
      "https://auth.hackclub.com/oauth/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          code,
          grant_type: "authorization_code",
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return NextResponse.json(
        {
          error: "Failed to exchange Hack Club code",
          details: tokenData,
        },
        { status: 400 }
      );
    }

    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.json(
        {
          error: "Hack Club did not return an access token",
        },
        { status: 400 }
      );
    }


    const profileResponse = await fetch(
      "https://auth.hackclub.com/api/v1/me",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );


    const profileData = await profileResponse.json();

    if (!profileResponse.ok) {
      return NextResponse.json(
        {
          error: "Failed to get Hack Club profile",
          details: profileData,
        },
        { status: 400 }
      );
    }

    console.log("Hack Club profile:", profileData);


    const response = NextResponse.redirect(
      new URL("/dashboard", request.url)
    );

    response.cookies.set("hackclub_access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;

  } catch (error) {
    console.error("Hack Club OAuth error:", error);

    return NextResponse.json(
      {
        error: "Hack Club authentication failed",
      },
      { status: 500 }
    );
  }
}