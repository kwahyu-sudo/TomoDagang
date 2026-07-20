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

/** Wraps an API handler with try-catch, returns proper error responses */
export function apiHandler(
  handler: (req: Request) => Promise<NextResponse>
): (req: Request) => Promise<NextResponse> {
  return async (req: Request) => {
    try {
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
