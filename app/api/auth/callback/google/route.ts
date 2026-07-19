import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import {
  exchangeGoogleCode,
  GoogleOAuthError,
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_OAUTH_VERIFIER_COOKIE,
  isValidOAuthState,
} from "@/lib/auth/google";
import { isRole } from "@/lib/auth/permissions";
import { AUTH_COOKIE_NAME, signSessionToken } from "@/lib/auth/session";
import { UserModel } from "@/models/User";

export async function GET(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  const clearOAuthCookies = (response: NextResponse) => {
    response.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
    response.cookies.delete(GOOGLE_OAUTH_VERIFIER_COOKIE);
    return response;
  };

  try {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const expectedState = request.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
    const verifier = request.cookies.get(GOOGLE_OAUTH_VERIFIER_COOKIE)?.value;

    if (
      !code ||
      !verifier ||
      !isValidOAuthState(state, expectedState)
    ) {
      loginUrl.searchParams.set("error", "google_state");
      return clearOAuthCookies(NextResponse.redirect(loginUrl));
    }

    const googleUser = await exchangeGoogleCode(
      code,
      verifier,
      request.nextUrl.origin,
    );
    const email = googleUser.email.trim().toLowerCase();

    await connectMongoDB();
    let user = await UserModel.findOne({
      $or: [
        { "authProviders.google.subject": googleUser.sub },
        { email },
      ],
    });

    if (user) {
      const linkedSubject = user.authProviders?.google?.subject;
      if (linkedSubject && linkedSubject !== googleUser.sub) {
        throw new Error("Email đã liên kết với tài khoản Google khác.");
      }
      user.authProviders = {
        ...user.authProviders,
        google: { subject: googleUser.sub },
      };
      user.displayName ||= googleUser.name || user.username;
      user.avatarUrl ||= googleUser.picture;
      await user.save();
    } else {
      const username = await createUniqueUsername(email);
      user = await UserModel.create({
        username,
        email,
        displayName: googleUser.name || username,
        avatarUrl: googleUser.picture,
        authProviders: { google: { subject: googleUser.sub } },
        roles: ["user"],
        status: "active",
      });
    }

    if (user.status !== "active") {
      loginUrl.searchParams.set("error", "account_disabled");
      return clearOAuthCookies(NextResponse.redirect(loginUrl));
    }

    const roles = user.roles.filter(isRole);
    const token = signSessionToken({
      userId: String(user._id),
      username: user.username,
      email: user.email,
      roles,
    });
    const destination = new URL(
      roles.includes("admin") ? "/admin" : "/flashcards",
      request.url,
    );
    const response = clearOAuthCookies(NextResponse.redirect(destination));
    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (error) {
    console.error("[Google OAuth callback]", error);
    loginUrl.searchParams.set(
      "error",
      error instanceof GoogleOAuthError ? error.code : "google_failed",
    );
    return clearOAuthCookies(NextResponse.redirect(loginUrl));
  }
}

async function createUniqueUsername(email: string) {
  const localPart = email.split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  const base = (localPart || "google_user").slice(0, 24).padEnd(3, "_");

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = attempt === 0 ? "" : `_${attempt}`;
    const username = `${base.slice(0, 32 - suffix.length)}${suffix}`;
    if (!(await UserModel.exists({ username }))) return username;
  }

  return `google_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}
