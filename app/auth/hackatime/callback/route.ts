import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/supabase";

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const oauthError = request.nextUrl.searchParams.get("error");

    if (oauthError) {
      return NextResponse.json(
        {
          error: "Hackatime authorization failed",
          details: oauthError,
        },
        { status: 400 }
      );
    }

    if (!code) {
      return NextResponse.json(
        {
          error: "No Hackatime authorization code received",
        },
        { status: 400 }
      );
    }


    const journalUserId = request.cookies.get(
      "journal_user_id"
    )?.value;

    if (!journalUserId) {
      return NextResponse.json(
        {
          error:
            "No Journal user session found. Please start signup again.",
        },
        { status: 400 }
      );
    }

    const clientId = process.env.HACKATIME_CLIENT_ID;
    const clientSecret = process.env.HACKATIME_CLIENT_SECRET;
    const siteUrl = process.env.SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    if (!clientId || !clientSecret || !siteUrl) {
      return NextResponse.json(
        {
          error: "Missing Hackatime configuration",
        },
        { status: 500 }
      );
    }

    const redirectUri =
      `${siteUrl}/auth/hackatime/callback`;

    const tokenResponse = await fetch(
      "https://hackatime.hackclub.com/oauth/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error(
        "Hackatime token error:",
        tokenData
      );

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
        {
          error:
            "Hackatime did not return an access token",
        },
        { status: 500 }
      );
    }

    const userResponse = await fetch(
      "https://hackatime.hackclub.com/api/v1/authenticated/me",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );

    const hackatimeUser = await userResponse.json();

    if (!userResponse.ok) {
      console.error(
        "Hackatime user error:",
        hackatimeUser
      );

      return NextResponse.json(
        {
          error: "Failed to get Hackatime user",
          details: hackatimeUser,
        },
        { status: 500 }
      );
    }

    console.log(
      "Hackatime user:",
      hackatimeUser
    );

    const hackatimeId =
      hackatimeUser.id ??
      hackatimeUser.user_id ??
      hackatimeUser.user?.id;

    if (!hackatimeId) {
      return NextResponse.json(
        {
          error:
            "Hackatime profile did not contain a user ID",
          profile: hackatimeUser,
        },
        { status: 400 }
      );
    }

    const hackatimeEmail =
      hackatimeUser.email ??
      hackatimeUser.user?.email ??
      null;


    const { data: user, error: updateError } =
      await supabase
        .from("users")
        .update({
          hackatime_id: String(hackatimeId),
          hackatime_email: hackatimeEmail,
          hackatime_user_id: String(hackatimeId),
          hackatime_access_token: accessToken,
          hackatime_connected: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", journalUserId)
        .select()
        .single();

    if (updateError) {
      console.error(
        "Supabase Hackatime update error:",
        updateError
      );

      return NextResponse.json(
        {
          error: "Failed to save Hackatime account",
          details: updateError,
        },
        { status: 500 }
      );
    }

    console.log(
      "Hackatime connected to Journal user:",
      user.id
    );


    const response = NextResponse.redirect(
      new URL("/auth/github", request.url)
    );

    response.cookies.set(
      "journal_user_id",
      String(user.id),
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 30,
      }
    );

    response.cookies.set(
      "hackatime_access_token",
      accessToken,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      }
    );

    return response;
  } catch (error) {
    console.error(
      "Hackatime callback error:",
      error
    );

    return NextResponse.json(
      {
        error: "Hackatime authentication failed",
        details:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}