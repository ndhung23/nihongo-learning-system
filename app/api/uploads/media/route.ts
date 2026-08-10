import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { AuthError, requireAnyPermission } from "@/lib/auth/session";

export const runtime = "nodejs";

const MAX_BYTES = 15 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const AUDIO_TYPES = new Set(["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/mp4", "audio/ogg", "audio/webm"]);

function cloudinaryConfig() {
  const value = process.env.CLOUDINARY_URL;
  if (!value) throw new Error("CLOUDINARY_URL chưa được cấu hình.");
  const url = new URL(value);
  return { cloudName: url.hostname, apiKey: decodeURIComponent(url.username), apiSecret: decodeURIComponent(url.password) };
}

export async function POST(request: Request) {
  try {
    await requireAnyPermission(["admin:course:create", "admin:course:update", "admin:jlpt-test:create", "admin:jlpt-test:update"]);
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ message: "Vui lòng chọn tệp." }, { status: 400 });
    const kind = IMAGE_TYPES.has(file.type) ? "image" : AUDIO_TYPES.has(file.type) ? "audio" : null;
    if (!kind) return NextResponse.json({ message: "Chỉ hỗ trợ ảnh JPG/PNG/WebP/GIF hoặc âm thanh MP3/WAV/M4A/OGG/WebM." }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ message: "Tệp không được lớn hơn 15 MB." }, { status: 413 });

    const { cloudName, apiKey, apiSecret } = cloudinaryConfig();
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `nihongo-learning/jlpt/${kind}`;
    const signature = createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`).digest("hex");
    const uploadBody = new FormData();
    uploadBody.set("file", file);
    uploadBody.set("api_key", apiKey);
    uploadBody.set("timestamp", String(timestamp));
    uploadBody.set("folder", folder);
    uploadBody.set("signature", signature);
    const resourceType = kind === "audio" ? "video" : "image";
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
      method: "POST",
      body: uploadBody,
      signal: AbortSignal.timeout(45_000),
    });
    const result = await response.json() as { secure_url?: string; error?: { message?: string } };
    if (!response.ok || !result.secure_url) throw new Error(result.error?.message || "Không thể tải tệp lên.");
    return NextResponse.json({ data: { url: result.secure_url, kind } }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.code === "UNAUTHORIZED" ? 401 : 403 });
    }
    return NextResponse.json({ message: error instanceof Error ? error.message : "Không thể tải tệp lên." }, { status: 500 });
  }
}
