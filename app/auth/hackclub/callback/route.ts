import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/supabase";
import { getSiteUrl } from "@/lib/url";

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const oauthError = request.nextUrl.searchParams.get("error");

    if (oauthError) {
      return NextResponse.json(
        {
          error: "Hack Club authorization failed",
          details: oauthError,
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
    const siteUrl = getSiteUrl(request);

    if (!clientId || !clientSecret || !siteUrl) {
      return NextResponse.json(
        {
          error: "Missing Hack Club configuration",
        },
        { status: 500 }
      );
    }

    const redirectUri = `${siteUrl}/auth/hackclub/callback`;

    const tokenResponse = await fetch(
      "https://auth.hackclub.com/oauth/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          grant_type: "authorization_code",
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("Hack Club token exchange failed:", tokenData);

      return NextResponse.json(
        {
          error: "Failed to exchange Hack Club code",
          details: tokenData,
        },
        { status: 500 }
      );
    }

    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.json(
        {
          error: "Hack Club did not return an access token",
        },
        { status: 500 }
      );
    }

    const profileResponse = await fetch(
      "https://auth.hackclub.com/oauth/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );

    const profile = await profileResponse.json();

    if (!profileResponse.ok) {
      console.error("Hack Club profile request failed:", profile);

      return NextResponse.json(
        {
          error: "Failed to get Hack Club profile",
          details: profile,
        },
        { status: 500 }
      );
    }

    const hackclubId = profile.sub;

    if (!hackclubId) {
      return NextResponse.json(
        {
          error: "Hack Club profile did not contain a user ID",
          profile,
        },
        { status: 400 }
      );
    }

    const hackclubEmail = profile.email ?? null;
    const firstName = profile.given_name ?? null;
    const lastName = profile.family_name ?? null;
    const slackId = profile.slack_id ?? null;

    const { data: user, error: saveError } = await supabase
      .from("users")
      .upsert(
        {
          hackclub_id: hackclubId,
          hackclub_email: hackclubEmail,
          hackclub_first_name: firstName,
          hackclub_last_name: lastName,
          hackclub_slack_id: slackId,
          hackclub_connected: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "hackclub_id",
        }
      )
      .select()
      .single();

    if (saveError) {
      console.error("Supabase Hack Club save error:", saveError);

      return NextResponse.json(
        {
          error: "Failed to save Hack Club user",
          details: saveError,
        },
        { status: 500 }
      );
    }

    // Redirect to Hackatime step, forwarding userId in query param so session is never lost across redirects
    const nextUrl = new URL("/auth/hackatime", siteUrl);
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

    response.cookies.set("hackclub_access_token", accessToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    console.error("Hack Club callback error:", error);

    return NextResponse.json(
      {
        error: "Hack Club authentication failed",
        details:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}