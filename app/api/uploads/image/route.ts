import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { AuthError, requirePermission } from "@/lib/auth/session";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function readCloudinaryConfig() {
  const value = process.env.CLOUDINARY_URL;
  if (!value) throw new Error("CLOUDINARY_URL chưa được cấu hình.");
  const url = new URL(value);
  const cloudName = url.hostname;
  const apiKey = decodeURIComponent(url.username);
  const apiSecret = decodeURIComponent(url.password);
  if (!cloudName || !apiKey || !apiSecret) throw new Error("CLOUDINARY_URL không đúng định dạng.");
  return { cloudName, apiKey, apiSecret };
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission("flashcard:create");
    const formData = await request.formData();
    const file = formData.get("file");
    const purpose = formData.get("purpose") === "avatar" ? "avatars" : "vocabulary";
    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Vui lòng chọn một ảnh." }, { status: 400 });
    }
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json({ message: "Chỉ hỗ trợ ảnh JPG, PNG, WebP hoặc GIF." }, { status: 400 });
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ message: "Ảnh không được lớn hơn 5 MB." }, { status: 413 });
    }

    const { cloudName, apiKey, apiSecret } = readCloudinaryConfig();
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `nihongo-learning/${purpose}/${session.userId}`;
    const signature = createHash("sha1")
      .update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`)
      .digest("hex");
    const uploadBody = new FormData();
    uploadBody.set("file", file);
    uploadBody.set("api_key", apiKey);
    uploadBody.set("timestamp", String(timestamp));
    uploadBody.set("folder", folder);
    uploadBody.set("signature", signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: uploadBody,
      signal: AbortSignal.timeout(20_000),
    });
    const result = (await response.json()) as { secure_url?: string; public_id?: string; error?: { message?: string } };
    if (!response.ok || !result.secure_url) {
      throw new Error(result.error?.message || "Cloudinary không thể tải ảnh lên.");
    }
    return NextResponse.json({ data: { url: result.secure_url, publicId: result.public_id } }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { message: error.message, code: error.code },
        { status: error.code === "UNAUTHORIZED" ? 401 : 403 },
      );
    }
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Không thể tải ảnh lên." },
      { status: 500 },
    );
  }
}
