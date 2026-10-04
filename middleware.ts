import { NextResponse, NextRequest } from "next/server";

export function middleware(
    request: NextRequest
) {
    const { pathname } = request.nextUrl;

    const journalUserId = request.cookies.get("journal_user_id")?.value;

    const isLoggedIn = Boolean(journalUserId);

    if (pathname === "/" && isLoggedIn) {
        return NextResponse.redirect(
            new URL("/dashboard", request.url)
        );
    }

    if (
        pathname.startsWith("/dashboard") &&
        !isLoggedIn
    ) {
        return NextResponse.redirect(
            new URL("/", request.url)
        );
    }

    return NextResponse.next();
}

export const config ={
    matcher: ["/","/dashboard/:path*",],
};

