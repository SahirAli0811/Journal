import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const clientId =
      process.env.GITHUB_CLIENT_ID;

    if (!clientId) {
      return NextResponse.json(
        {
          error:
            "GITHUB_CLIENT_ID is not configured.",
        },
        { status: 500 }
      );
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    if (!siteUrl) {
      return NextResponse.json(
        {
          error:
            "NEXT_PUBLIC_SITE_URL is not configured.",
        },
        { status: 500 }
      );
    }

    const redirectUri =
      `${siteUrl.replace(/\/$/, "")}/auth/github/callback`;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "user:email repo",
    });

    const githubUrl =
      `https://github.com/login/oauth/authorize?${params.toString()}`;

    return NextResponse.redirect(
      githubUrl
    );
  } catch (error) {
    console.error(
      "GitHub OAuth start error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to start GitHub OAuth.",
      },
      { status: 500 }
    );
  }
}