import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const response = NextResponse.redirect(
        new URL("/", url.origin)
    );

    response.cookies.set("journal_user_id", "", {
        httpOnly: true,
        expires: new Date(0),
        path: "/",
    });
    response.cookies.set(
        "hackclub_access_token",
        "",
        {
            httpOnly: true,
            expires: new Date(0),
            path: "/",
        }
    );
    response.cookies.set(
        "hackatime_access_token",
        "",
        {
            httpOnly: true,
            expires: new Date(0),
            path: "/",
        }
    );

    response.cookies.set(
        "github_access_token",
        "",
        {
            httpOnly: true,
            expires: new Date(0),
            path: "/",
        }
    );

    return response;
}