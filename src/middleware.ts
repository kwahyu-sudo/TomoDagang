import { NextRequest, NextResponse } from "next/server";

/**
 * In-memory sliding-window rate limiter.
 *
 * NOTE: state lives in the server process and resets on restart / is per-instance
 * (no shared store across multiple instances). For a serious multi-instance
 * production deployment, swap this for Redis/Upstash. For this UMKM app a single
 * Node process is sufficient.
 */

type Bucket = { count: number; resetAt: number };

const limits: Record<string, { windowMs: number; max: number }> = {
    "/api/auth": { windowMs: 60_000, max: 10 }, // brute-force protection
    "/api/webhook": { windowMs: 60_000, max: 30 }, // webhook already HMAC-protected
    "/api": { windowMs: 60_000, max: 60 }, // general API
};

const buckets = new Map<string, Bucket>();

function pickLimit(pathname: string) {
    if (pathname.startsWith("/api/auth")) return limits["/api/auth"];
    if (pathname.startsWith("/api/webhook")) return limits["/api/webhook"];
    if (pathname.startsWith("/api")) return limits["/api"];
    return null;
}

function getClientIp(req: NextRequest): string {
    const fwd = req.headers.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0].trim();
    return req.headers.get("x-real-ip") ?? "unknown";
}

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const limit = pickLimit(pathname);
    if (!limit) return NextResponse.next();

    const key = `${getClientIp(req)}:${pathname.startsWith("/api/auth") ? "auth" : pathname.startsWith("/api/webhook") ? "webhook" : "api"}`;
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + limit.windowMs });
        return NextResponse.next();
    }

    if (bucket.count >= limit.max) {
        const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
        return new NextResponse(
            JSON.stringify({ error: "Too many requests", retryAfter }),
            {
                status: 429,
                headers: {
                    "content-type": "application/json",
                    "retry-after": String(retryAfter),
                },
            }
        );
    }

    bucket.count += 1;
    return NextResponse.next();
}

export const config = {
    matcher: ["/api/:path*"],
};