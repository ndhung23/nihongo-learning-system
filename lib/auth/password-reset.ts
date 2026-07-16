import crypto from "crypto";

export function createPasswordResetToken() {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashPasswordResetToken(token);

  return { token, tokenHash };
}

export function hashPasswordResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function getPasswordResetExpiresAt() {
  return new Date(Date.now() + 15 * 60 * 1000);
}
