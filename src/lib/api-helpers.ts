import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { ValidationError } from "@/lib/validate";

/** Returns 401 NextResponse if not authenticated, or null if OK */
export async function requireAuth(): Promise<NextResponse | null> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/** Returns 403 if Origin/Referer doesn't match NEXTAUTH_URL (CSRF guard for non-GET) */
function csrfGuard(req: Request): NextResponse | null {
  if (req.method === "GET") return null;
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const allowed = process.env.NEXTAUTH_URL || "http://localhost:3000";
  if (origin && !origin.startsWith(allowed)) {
    return NextResponse.json({ error: "CSRF: origin mismatch" }, { status: 403 });
  }
  if (referer && !referer.startsWith(allowed)) {
    return NextResponse.json({ error: "CSRF: referer mismatch" }, { status: 403 });
  }
  return null;
}

/** Wraps an API handler with try-catch + CSRF guard, returns proper error responses */
export function apiHandler(
  handler: (req: Request) => Promise<NextResponse>
): (req: Request) => Promise<NextResponse> {
  return async (req: Request) => {
    try {
      const csrf = csrfGuard(req);
      if (csrf) return csrf;
      return await handler(req);
    } catch (err) {
      if (err instanceof ValidationError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      const message = err instanceof Error ? err.message : "Internal server error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}
