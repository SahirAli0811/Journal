import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/supabase";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { error: "No GitHub authorization code received" },
      { status: 400 }
    );
  }

  try {
     const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri:
            "http://localhost:3000/auth/github/callback",
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      console.error("GitHub token error:", tokenData);

      return NextResponse.json(
        {
          error: "Failed to exchange GitHub code",
          details: tokenData,
        },
        { status: 500 }
      );
    }

    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.json(
        {
          error: "GitHub did not return an access token",
        },
        { status: 500 }
      );
    }

    console.log("GitHub access token received");

    const profileResponse = await fetch(
      "https://api.github.com/user",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    const githubUser = await profileResponse.json();

    if (!profileResponse.ok) {
      console.error("GitHub profile error:", githubUser);

      return NextResponse.json(
        {
          error: "Failed to get GitHub profile",
          details: githubUser,
        },
        { status: 500 }
      );
    }

    console.log("GitHub user:", {
      id: githubUser.id,
      login: githubUser.login,
      email: githubUser.email,
    });


    let githubEmail = githubUser.email;

    if (!githubEmail) {
      const emailResponse = await fetch(
        "https://api.github.com/user/emails",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }
      );

      const emails = await emailResponse.json();

      if (emailResponse.ok && Array.isArray(emails)) {
        const primaryEmail = emails.find(
          (email: any) => email.primary && email.verified
        );

        githubEmail =
          primaryEmail?.email ||
          emails.find((email: any) => email.verified)?.email ||
          null;
      }
    }

    const { data: existingUser, error: findError } =
      await supabase
        .from("users")
        .select("id, hackatime_id")
        .not("hackatime_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (findError) {
      console.error("Find user error:", findError);

      return NextResponse.json(
        {
          error: "Failed to find existing user",
          details: findError,
        },
        { status: 500 }
      );
    }

    if (!existingUser) {
      return NextResponse.json(
        {
          error:
            "No Hackatime user found. Please authorize Hackatime first.",
        },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({
        github_id: String(githubUser.id),
        github_username: githubUser.login,
        github_email: githubEmail,
        github_access_token: accessToken,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingUser.id);

    if (updateError) {
      console.error("Supabase GitHub update error:", updateError);

      return NextResponse.json(
        {
          error: "Failed to save GitHub account",
          details: updateError,
        },
        { status: 500 }
      );
    }

    console.log("GitHub account saved successfully");

    return NextResponse.redirect(
      new URL("/dashboard", request.url)
    );

  } catch (error) {
    console.error("GitHub callback error:", error);

    return NextResponse.json(
      {
        error: "GitHub authentication failed",
      },
      { status: 500 }
    );
  }
}