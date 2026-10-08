import { NextRequest, NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const siteUrl = getSiteUrl(request);

    if (!clientId) {
      return NextResponse.json(
        {
          error: "GITHUB_CLIENT_ID is not configured.",
        },
        { status: 500 }
      );
    }

    // Preserve userId from query param or session cookie
    const userId =
      request.nextUrl.searchParams.get("userId") ||
      request.cookies.get("journal_user_id")?.value;

    const redirectUri = `${siteUrl}/auth/github/callback`;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "user:email repo",
      ...(userId ? { state: userId } : {}),
    });

    const githubUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

    return NextResponse.redirect(githubUrl);
  } catch (error) {
    console.error("GitHub OAuth start error:", error);

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