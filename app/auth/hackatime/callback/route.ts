import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/supabase";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { error: "No Hackatime authorization code received" },
      { status: 400 }
    );
  }

  try {
    const tokenResponse = await fetch(
      "https://hackatime.hackclub.com/oauth/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: process.env.HACKATIME_CLIENT_ID,
          client_secret: process.env.HACKATIME_CLIENT_SECRET,
          code,
          redirect_uri:
            "http://localhost:3000/auth/hackatime/callback",
          grant_type: "authorization_code",
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("Hackatime token error:", tokenData);

      return NextResponse.json(
        {
          error: "Failed to exchange Hackatime code",
          details: tokenData,
        },
        { status: 500 }
      );
    }

    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Hackatime did not return an access token" },
        { status: 500 }
      );
    }

    const userResponse = await fetch(
      "https://hackatime.hackclub.com/api/v1/authenticated/me",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const hackatimeUser = await userResponse.json();

    if (!userResponse.ok) {
      console.error("Hackatime user error:", hackatimeUser);

      return NextResponse.json(
        {
          error: "Failed to get Hackatime user",
          details: hackatimeUser,
        },
        { status: 500 }
      );
    }

    console.log("Hackatime user:", hackatimeUser);

    const { error } = await supabase
      .from("users")
      .upsert(
        {
          hackatime_id: String(hackatimeUser.id),
          hackatime_email:
            hackatimeUser.email ||
            hackatimeUser.emails?.[0] ||
            null,
          hackatime_access_token: accessToken,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "hackatime_id",
        }
      );

    if (error) {
      console.error("Supabase error:", error);

      return NextResponse.json(
        {
          error: "Failed to save Hackatime user",
          details: error,
        },
        { status: 500 }
      );
    }

    console.log("Hackatime user saved to Supabase");

    return NextResponse.redirect(
      new URL("/auth/github", request.url)
    );
  } catch (error) {
    console.error("Hackatime callback error:", error);

    return NextResponse.json(
      { error: "Hackatime authentication failed" },
      { status: 500 }
    );
  }
}