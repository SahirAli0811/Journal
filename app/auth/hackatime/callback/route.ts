import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/supabase";
import { getSiteUrl } from "@/lib/url";

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const oauthError = request.nextUrl.searchParams.get("error");
    const state = request.nextUrl.searchParams.get("state");

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

    // Retrieve userId from state parameter or cookie
    let journalUserId = state || request.cookies.get("journal_user_id")?.value;

    const clientId = process.env.HACKATIME_CLIENT_ID;
    const clientSecret = process.env.HACKATIME_CLIENT_SECRET;
    const siteUrl = getSiteUrl(request);

    if (!clientId || !clientSecret || !siteUrl) {
      return NextResponse.json(
        {
          error: "Missing Hackatime configuration",
        },
        { status: 500 }
      );
    }

    const redirectUri = `${siteUrl}/auth/hackatime/callback`;

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
        {
          error: "Hackatime did not return an access token",
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
      console.error("Hackatime user error:", hackatimeUser);

      return NextResponse.json(
        {
          error: "Failed to get Hackatime user",
          details: hackatimeUser,
        },
        { status: 500 }
      );
    }

    const hackatimeId =
      hackatimeUser.id ??
      hackatimeUser.user_id ??
      hackatimeUser.data?.id ??
      hackatimeUser.user?.id;

    if (!hackatimeId) {
      return NextResponse.json(
        {
          error: "Hackatime profile did not contain a user ID",
          profile: hackatimeUser,
        },
        { status: 400 }
      );
    }

    const hackatimeEmail =
      hackatimeUser.email ??
      hackatimeUser.data?.email ??
      hackatimeUser.user?.email ??
      null;

    // Fallback: If session cookie was lost, attempt match by email
    if (!journalUserId && hackatimeEmail) {
      const { data: userByEmail } = await supabase
        .from("users")
        .select("id")
        .eq("hackclub_email", hackatimeEmail)
        .maybeSingle();

      if (userByEmail) {
        journalUserId = userByEmail.id;
      }
    }

    if (!journalUserId) {
      return NextResponse.json(
        {
          error: "No Journal user session found. Please start signup again.",
        },
        { status: 400 }
      );
    }

    const { data: user, error: updateError } = await supabase
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
      console.error("Supabase Hackatime update error:", updateError);

      return NextResponse.json(
        {
          error: "Failed to save Hackatime account",
          details: updateError,
        },
        { status: 500 }
      );
    }

    // Redirect to GitHub step forwarding userId so session persists
    const nextUrl = new URL("/auth/github", siteUrl);
    nextUrl.searchParams.set("userId", user.id);

    const response = NextResponse.redirect(nextUrl);
    const isSecure = siteUrl.startsWith("https://");

    response.cookies.set("journal_user_id", String(user.id), {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    response.cookies.set("hackatime_access_token", accessToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    console.error("Hackatime callback error:", error);

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