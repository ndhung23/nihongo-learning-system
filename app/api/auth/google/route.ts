import { NextRequest, NextResponse } from "next/server";
import {
  createGoogleAuthorization,
  GOOGLE_OAUTH_COOKIE_MAX_AGE,
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_OAUTH_VERIFIER_COOKIE,
} from "@/lib/auth/google";

export async function GET(request: NextRequest) {
  try {
    const authorization = createGoogleAuthorization(request.nextUrl.origin);
    const response = NextResponse.redirect(authorization.url);
    const cookieOptions = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: GOOGLE_OAUTH_COOKIE_MAX_AGE,
    };

    response.cookies.set(
      GOOGLE_OAUTH_STATE_COOKIE,
      authorization.state,
      cookieOptions,
    );
    response.cookies.set(
      GOOGLE_OAUTH_VERIFIER_COOKIE,
      authorization.verifier,
      cookieOptions,
    );
    return response;
  } catch {
    return NextResponse.redirect(new URL("/login?error=google_config", request.url));
  }
}
