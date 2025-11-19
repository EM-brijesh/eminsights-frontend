import { NextResponse } from "next/server";

export function middleware(request) {
    const token = request.cookies.get("auth")?.value;

    if (process.env.NODE_ENV !== "production") {
        console.log("🔍 Middleware check", {
            path: request.nextUrl.pathname,
            hasToken: Boolean(token),
        });
    }

    // Allow public routes (login, register, API, next internals, static assets)
    const publicPaths = ["/", "/auth", "/reset-password", "/test-api"];
    const isPublic = publicPaths.some((path) =>
        request.nextUrl.pathname.startsWith(path)
    );

    if (isPublic) {
        // If user is already authenticated, keep them out of auth pages
        if (token && (request.nextUrl.pathname === "/" || request.nextUrl.pathname.startsWith("/auth"))) {
            if (process.env.NODE_ENV !== "production") {
                console.log("🔁 Token present on public path, redirecting to /inbox");
            }
            return NextResponse.redirect(new URL("/inbox", request.nextUrl.origin));
        }
        if (process.env.NODE_ENV !== "production") {
            console.log("🟢 Public path, allowing:", request.nextUrl.pathname);
        }
        return NextResponse.next();
    }

    if (!token) {
        if (process.env.NODE_ENV !== "production") {
            console.log(" No token, redirecting to /auth/login");
        }
        return NextResponse.redirect(new URL("/auth/login", request.nextUrl.origin));
    }

    // Do not verify token on the client; presence is enough to allow access
    if (process.env.NODE_ENV !== "production") {
        console.log("✅ Token present, access granted");
    }
    return NextResponse.next();
}

// Apply to all routes except API, _next, static files, favicon
export const config = {
    matcher: ["/((?!api|_next|static|favicon.ico).*)"],
};
