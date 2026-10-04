import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/supabase";

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const oauthError = request.nextUrl.searchParams.get("error");

    if (oauthError) {
      return NextResponse.json(
        {
          error: "GitHub authorization failed",
          details: oauthError,
        },
        { status: 400 }
      );
    }

    if (!code) {
      return NextResponse.json(
        {
          error: "No GitHub authorization code received",
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

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret =
      process.env.GITHUB_CLIENT_SECRET;
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL;

    if (!clientId || !clientSecret || !siteUrl) {
      return NextResponse.json(
        {
          error: "Missing GitHub configuration",
        },
        { status: 500 }
      );
    }

    const redirectUri =
      `${siteUrl}/auth/github/callback`;


    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      console.error(
        "GitHub token error:",
        tokenData
      );

      return NextResponse.json(
        {
          error:
            "Failed to exchange GitHub code",
          details: tokenData,
        },
        { status: 500 }
      );
    }

    const accessToken =
      tokenData.access_token;

    if (!accessToken) {
      return NextResponse.json(
        {
          error:
            "GitHub did not return an access token",
        },
        { status: 500 }
      );
    }


    const profileResponse = await fetch(
      "https://api.github.com/user",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept:
            "application/vnd.github+json",
          "X-GitHub-Api-Version":
            "2022-11-28",
        },
        cache: "no-store",
      }
    );

    const githubUser =
      await profileResponse.json();

    if (!profileResponse.ok) {
      console.error(
        "GitHub profile error:",
        githubUser
      );

      return NextResponse.json(
        {
          error:
            "Failed to get GitHub profile",
          details: githubUser,
        },
        { status: 500 }
      );
    }

    console.log(
      "GitHub user:",
      {
        id: githubUser.id,
        login: githubUser.login,
        name: githubUser.name,
        email: githubUser.email,
      }
    );


    let githubEmail =
      githubUser.email ?? null;

    if (!githubEmail) {
      const emailResponse = await fetch(
        "https://api.github.com/user/emails",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept:
              "application/vnd.github+json",
            "X-GitHub-Api-Version":
              "2022-11-28",
          },
          cache: "no-store",
        }
      );

      const emails =
        await emailResponse.json();

      if (
        emailResponse.ok &&
        Array.isArray(emails)
      ) {
        const primaryEmail =
          emails.find(
            (email: any) =>
              email.primary &&
              email.verified
          );

        githubEmail =
          primaryEmail?.email ??
          emails.find(
            (email: any) =>
              email.verified
          )?.email ??
          null;
      }
    }


    const { data: user, error: updateError } =
      await supabase
        .from("users")
        .update({
          github_id: String(
            githubUser.id
          ),

          github_user_id: String(
            githubUser.id
          ),

          github_username:
            githubUser.login ?? null,

          github_name:
            githubUser.name ?? null,

          github_email:
            githubEmail,

          github_avatar_url:
            githubUser.avatar_url ?? null,

          github_access_token:
            accessToken,

          github_connected: true,

          updated_at:
            new Date().toISOString(),
        })
        .eq("id", journalUserId)
        .select()
        .single();

    if (updateError) {
      console.error(
        "Supabase GitHub update error:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "Failed to save GitHub account",
          details: updateError,
        },
        { status: 500 }
      );
    }

    console.log(
      "GitHub connected to Journal user:",
      user.id
    );

    const response =
      NextResponse.redirect(
        new URL(
          "/dashboard",
          request.url
        )
      );

    response.cookies.set(
      "journal_user_id",
      String(user.id),
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      }
    );

    response.cookies.set(
      "github_access_token",
      accessToken,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      }
    );

    return response;
  } catch (error) {
    console.error(
      "GitHub callback error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "GitHub authentication failed",
        details:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}