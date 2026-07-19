import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const GOOGLE_OAUTH_STATE_COOKIE = "nihongo_google_oauth_state";
export const GOOGLE_OAUTH_VERIFIER_COOKIE = "nihongo_google_oauth_verifier";
export const GOOGLE_OAUTH_COOKIE_MAX_AGE = 10 * 60;

const GoogleTokenSchema = z.object({
  access_token: z.string().min(1),
});

const GoogleUserSchema = z.object({
  sub: z.string().min(1),
  email: z.string().email(),
  email_verified: z.boolean(),
  name: z.string().optional(),
  picture: z.string().url().optional(),
});

export class GoogleOAuthError extends Error {
  constructor(
    public code: "google_token" | "google_profile",
    message: string,
  ) {
    super(message);
    this.name = "GoogleOAuthError";
  }
}

export function getGoogleConfig(origin: string) {
  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth chưa được cấu hình.");
  }

  const appOrigin = (
    process.env.AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    origin
  ).replace(/\/+$/, "");
  return {
    clientId,
    clientSecret,
    callbackUrl: `${appOrigin}/api/auth/callback/google`,
  };
}

export function createGoogleAuthorization(origin: string) {
  const config = getGoogleConfig(origin);
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256")
    .update(verifier)
    .digest("base64url");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");

  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.callbackUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("prompt", "select_account");

  return { url, state, verifier };
}

export function isValidOAuthState(received: string | null, expected?: string) {
  if (!received || !expected) return false;
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer);
}

export async function exchangeGoogleCode(
  code: string,
  verifier: string,
  origin: string,
) {
  const config = getGoogleConfig(origin);
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.callbackUrl,
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (!tokenResponse.ok) {
    throw new GoogleOAuthError(
      "google_token",
      `Google từ chối mã đăng nhập (${tokenResponse.status}).`,
    );
  }
  const token = GoogleTokenSchema.parse(await tokenResponse.json());

  const userResponse = await fetch(
    "https://openidconnect.googleapis.com/v1/userinfo",
    {
      headers: { Authorization: `Bearer ${token.access_token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!userResponse.ok) {
    throw new GoogleOAuthError(
      "google_profile",
      `Không thể đọc thông tin tài khoản Google (${userResponse.status}).`,
    );
  }

  const user = GoogleUserSchema.parse(await userResponse.json());
  if (!user.email_verified) {
    throw new GoogleOAuthError(
      "google_profile",
      "Email Google chưa được xác minh.",
    );
  }
  return user;
}
