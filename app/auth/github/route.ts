import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: "Missing GitHub configuration" },
      { status: 500 }
    );
  }

  const redirectUri =
    "http://localhost:3000/auth/github/callback";

  const githubUrl = new URL(
    "https://github.com/login/oauth/authorize"
  );

  githubUrl.searchParams.set("client_id", clientId);
  githubUrl.searchParams.set("redirect_uri", redirectUri);
  githubUrl.searchParams.set("scope", "read:user user:email");

  return NextResponse.redirect(githubUrl.toString());
}