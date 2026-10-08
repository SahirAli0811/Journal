import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GITHUB_TOKEN_URL =
  "https://github.com/login/oauth/access_token";

const GITHUB_API_URL =
  "https://api.github.com";

const GITHUB_API_VERSION =
  "2022-11-28";

export async function GET(
  request: NextRequest
) {
  try {
    const code =
      request.nextUrl.searchParams.get(
        "code"
      );

    const oauthError =
      request.nextUrl.searchParams.get(
        "error"
      );

    const oauthErrorDescription =
      request.nextUrl.searchParams.get(
        "error_description"
      );

    if (oauthError) {
      console.error(
        "GitHub OAuth authorization error:",
        {
          error: oauthError,
          description:
            oauthErrorDescription,
        }
      );

      return NextResponse.json(
        {
          error:
            "GitHub authorization failed.",
          details:
            oauthErrorDescription ||
            oauthError,
        },
        { status: 400 }
      );
    }

    if (!code) {
      return NextResponse.json(
        {
          error:
            "No GitHub authorization code received.",
        },
        { status: 400 }
      );
    }

    const journalUserId =
      request.cookies.get(
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

    const clientId =
      process.env.GITHUB_CLIENT_ID;

    const clientSecret =
      process.env.GITHUB_CLIENT_SECRET;

    const siteUrl =
      process.env.SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    if (
      !clientId ||
      !clientSecret ||
      !siteUrl
    ) {
      console.error(
        "Missing GitHub OAuth configuration."
      );

      return NextResponse.json(
        {
          error:
            "Missing GitHub configuration.",
        },
        { status: 500 }
      );
    }

    const redirectUri =
      `${siteUrl.replace(/\/$/, "")}/auth/github/callback`;

    const tokenResponse =
      await fetch(
        GITHUB_TOKEN_URL,
        {
          method: "POST",
          headers: {
            Accept:
              "application/json",
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            client_id:
              clientId,
            client_secret:
              clientSecret,
            code,
            redirect_uri:
              redirectUri,
          }),
          cache: "no-store",
        }
      );

    const tokenText =
      await tokenResponse.text();

    let tokenData: {
      access_token?: string;
      token_type?: string;
      scope?: string;
      error?: string;
      error_description?: string;
    } = {};

    if (tokenText.trim()) {
      try {
        tokenData =
          JSON.parse(tokenText);
      } catch {
        console.error(
          "GitHub token response was not valid JSON:",
          tokenText
        );
      }
    }

    if (
      !tokenResponse.ok ||
      tokenData.error
    ) {
      console.error(
        "GitHub token exchange failed:",
        {
          status:
            tokenResponse.status,
          error:
            tokenData.error,
          description:
            tokenData.error_description,
        }
      );

      return NextResponse.json(
        {
          error:
            "Failed to exchange GitHub authorization code.",
          details:
            tokenData.error_description ||
            tokenData.error ||
            `GitHub returned HTTP ${tokenResponse.status}.`,
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
            "GitHub did not return an access token.",
        },
        { status: 500 }
      );
    }

    const profileResponse =
      await fetch(
        `${GITHUB_API_URL}/user`,
        {
          method: "GET",
          headers: {
            Authorization:
              `Bearer ${accessToken}`,
            Accept:
              "application/vnd.github+json",
            "X-GitHub-Api-Version":
              GITHUB_API_VERSION,
          },
          cache: "no-store",
        }
      );

    const profileText =
      await profileResponse.text();

    let githubUser: {
      id?: number;
      login?: string;
      name?: string | null;
      email?: string | null;
      avatar_url?: string | null;
    } = {};

    if (profileText.trim()) {
      try {
        githubUser =
          JSON.parse(profileText);
      } catch {
        console.error(
          "GitHub profile response was not valid JSON:",
          profileText
        );
      }
    }

    if (!profileResponse.ok) {
      console.error(
        "Fresh GitHub token failed validation:",
        {
          status:
            profileResponse.status,
          response:
            githubUser,
        }
      );

      return NextResponse.json(
        {
          error:
            "GitHub returned an invalid access token.",
          details:
            typeof githubUser ===
              "object" &&
            "message" in githubUser
              ? (
                  githubUser as {
                    message?: string;
                  }
                ).message
              : `GitHub returned HTTP ${profileResponse.status}.`,
        },
        { status: 401 }
      );
    }

    if (!githubUser.id) {
      return NextResponse.json(
        {
          error:
            "GitHub authentication succeeded, but no GitHub user was returned.",
        },
        { status: 500 }
      );
    }

    console.log(
      "Fresh GitHub token validated:",
      {
        id: githubUser.id,
        login:
          githubUser.login,
        name:
          githubUser.name,
      }
    );


    let githubEmail =
      githubUser.email ??
      null;

    if (!githubEmail) {
      const emailResponse =
        await fetch(
          `${GITHUB_API_URL}/user/emails`,
          {
            method: "GET",
            headers: {
              Authorization:
                `Bearer ${accessToken}`,
              Accept:
                "application/vnd.github+json",
              "X-GitHub-Api-Version":
                GITHUB_API_VERSION,
            },
            cache: "no-store",
          }
        );

      const emailText =
        await emailResponse.text();

      let emails: Array<{
        email?: string;
        primary?: boolean;
        verified?: boolean;
      }> = [];

      if (emailText.trim()) {
        try {
          const parsed =
            JSON.parse(emailText);

          if (
            Array.isArray(parsed)
          ) {
            emails =
              parsed;
          }
        } catch {
          console.error(
            "GitHub email response was not valid JSON."
          );
        }
      }

      if (
        emailResponse.ok &&
        emails.length > 0
      ) {
        const primaryEmail =
          emails.find(
            (email) =>
              email.primary &&
              email.verified
          );

        const verifiedEmail =
          emails.find(
            (email) =>
              email.verified
          );

        githubEmail =
          primaryEmail?.email ??
          verifiedEmail?.email ??
          null;
      }
    }

    const updatePayload: Record<
      string,
      unknown
    > = {
      github_id:
        String(githubUser.id),

      github_username:
        githubUser.login ??
        null,

      github_name:
        githubUser.name ??
        null,

      github_email:
        githubEmail,

      github_avatar_url:
        githubUser.avatar_url ??
        null,

      github_access_token:
        accessToken,

      github_connected:
        true,

      updated_at:
        new Date().toISOString(),
    };

    const {
      data: user,
      error: updateError,
    } = await supabase
      .from("users")
      .update(updatePayload)
      .eq(
        "id",
        journalUserId
      )
      .select(
        "id, github_id, github_username, github_connected"
      )
      .single();

    if (updateError) {
      console.error(
        "Supabase GitHub update error:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "Failed to save GitHub account.",
          details:
            updateError.message,
        },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        {
          error:
            "GitHub was connected, but the Journal user could not be updated.",
        },
        { status: 500 }
      );
    }

    console.log(
      "GitHub connected successfully:",
      {
        journalUserId:
          user.id,
        githubId:
          user.github_id,
        githubUsername:
          user.github_username,
      }
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
        maxAge:
          60 * 60 * 24 * 30,
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
        maxAge:
          60 * 60 * 24 * 30,
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
          "GitHub authentication failed.",
        details:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}