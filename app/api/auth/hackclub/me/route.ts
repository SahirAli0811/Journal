import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("hackclub_access_token")?.value;

  if (!token) {
    return NextResponse.json(
      {
        authenticated: false,
        error: "Not authenticated with Hack Club",
      },
      { status: 401 }
    );
  }

  try {
    const response = await fetch(
      "https://auth.hackclub.com/api/v1/me",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          authenticated: false,
          error: "Failed to fetch Hack Club profile",
          details: data,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      authenticated: true,
      hackclub: data,
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        authenticated: false,
        error: "Failed to contact Hack Club",
      },
      { status: 500 }
    );
  }
}