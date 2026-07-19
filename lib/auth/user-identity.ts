import { z } from "zod";

export function normalizePhone(value?: string) {
  const compact = (value || "").trim().replace(/[^\d+]/g, "");
  if (!compact) return "";

  if (compact.startsWith("+84")) return `0${compact.slice(3)}`;
  if (compact.startsWith("84") && compact.length >= 11) {
    return `0${compact.slice(2)}`;
  }
  return compact.replace(/\D/g, "");
}

export function isValidVietnamesePhone(phone: string) {
  return !phone || /^0\d{8,10}$/.test(phone);
}

export function validationMessage(error: z.ZodError, fallback: string) {
  return error.issues[0]?.message || fallback;
}

export function duplicateKeyMessage(error: unknown) {
  if (!isDuplicateKeyError(error)) return null;

  if ("email" in error.keyPattern) return "Email này đã được sử dụng.";
  if ("username" in error.keyPattern) return "Username này đã được sử dụng.";
  if ("profile.phone" in error.keyPattern) return "Số điện thoại này đã được sử dụng.";
  return "Thông tin tài khoản đã tồn tại.";
}

function isDuplicateKeyError(
  error: unknown,
): error is { code: number; keyPattern: Record<string, unknown> } {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000 &&
      "keyPattern" in error &&
      error.keyPattern &&
      typeof error.keyPattern === "object",
  );
}
