import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requirePermission } from "@/lib/auth/session";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);
const WordSchema = z.object({
  term: z.string().trim().min(1).max(100),
  kana: z.string().trim().max(100).default(""),
  romaji: z.string().trim().max(100).default(""),
  partOfSpeech: z.string().trim().max(100).default(""),
  meaningVi: z.string().trim().min(1).max(500),
  exampleJa: z.string().trim().max(500).default(""),
  exampleVi: z.string().trim().max(500).default(""),
  exampleKana: z.string().trim().max(500).default(""),
  exampleRomaji: z.string().trim().max(500).default(""),
  imageUrl: z.string().default(""),
});
const ResultSchema = z.object({ words: z.array(WordSchema).min(1).max(300) });

function geminiKeys() {
  return Array.from(new Set(Object.entries(process.env)
    .filter(([name, value]) => Boolean(value) && (
      name === "GEMINI_API_KEY" || name === "APIKEYGEMINI" ||
      name === "GOOGLE_GENERATIVE_AI_API_KEY" || /^GEMINI_API_KEY_\d+$/.test(name)
    ))
    .map(([, value]) => value as string)));
}

function responseText(payload: unknown) {
  const data = payload as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim() || "";
}

export async function POST(request: Request) {
  try {
    await requirePermission("flashcard:create");
    const formData = await request.formData();
    const files = formData.getAll("files").filter((item): item is File => item instanceof File);
    if (!files.length || files.length > 10) {
      return NextResponse.json({ message: "Chọn từ 1 đến 10 ảnh hoặc file PDF." }, { status: 400 });
    }
    if (files.some((file) => !ALLOWED_TYPES.has(file.type) || file.size > 12 * 1024 * 1024)) {
      return NextResponse.json({ message: "Chỉ hỗ trợ JPG, PNG, WebP, GIF, PDF; mỗi file tối đa 12 MB." }, { status: 400 });
    }
    const keys = geminiKeys();
    if (!keys.length) return NextResponse.json({ message: "Chưa cấu hình Gemini để đọc ảnh/PDF." }, { status: 503 });
    const fileParts = await Promise.all(files.map(async (file) => ({
      inlineData: { mimeType: file.type, data: Buffer.from(await file.arrayBuffer()).toString("base64") },
    })));
    const prompt = [
      "Trích xuất toàn bộ từ vựng tiếng Nhật trong các ảnh/PDF theo đúng thứ tự.",
      "Mỗi từ gồm term, kana, romaji, partOfSpeech, meaningVi, exampleJa, exampleVi, exampleKana, exampleRomaji, imageUrl.",
      "meaningVi phải là tiếng Việt. Nếu thiếu kana, romaji, từ loại, ví dụ, bản dịch, ví dụ kana (exampleKana) hoặc ví dụ romaji (exampleRomaji) thì tự bổ sung chính xác.",
      "imageUrl luôn rỗng. Không tạo từ trùng lặp. Chỉ trả JSON đúng schema.",
    ].join("\n");
    const models = Array.from(new Set([process.env.GEMINI_MODEL, "gemini-2.5-flash", "gemini-2.0-flash"].filter(Boolean))) as string[];
    let lastError = "Không thể đọc từ vựng trong tài liệu.";
    for (const model of models) {
      for (const key of keys) {
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }, ...fileParts] }],
              generationConfig: {
                responseMimeType: "application/json",
                responseJsonSchema: {
                  type: "object",
                  properties: { words: { type: "array", items: { type: "object", properties: {
                    term: { type: "string" }, kana: { type: "string" }, romaji: { type: "string" },
                    partOfSpeech: { type: "string" }, meaningVi: { type: "string" },
                    exampleJa: { type: "string" }, exampleVi: { type: "string" },
                    exampleKana: { type: "string" }, exampleRomaji: { type: "string" }, imageUrl: { type: "string" },
                  }, required: ["term", "kana", "romaji", "partOfSpeech", "meaningVi", "exampleJa", "exampleVi", "exampleKana", "exampleRomaji", "imageUrl"] } } },
                  required: ["words"],
                },
                temperature: 0.1,
                maxOutputTokens: 16_384,
              },
            }),
            signal: AbortSignal.timeout(60_000),
          });
          if (!response.ok) {
            lastError = `Dịch vụ đọc tài liệu trả lỗi ${response.status}.`;
            continue;
          }
          const text = responseText(await response.json());
          if (text) return NextResponse.json({ data: ResultSchema.parse(JSON.parse(text)) });
        } catch (error) {
          lastError = error instanceof Error ? error.message : lastError;
        }
      }
    }
    return NextResponse.json({ message: lastError }, { status: 502 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.code === "UNAUTHORIZED" ? 401 : 403 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Đã đọc tài liệu nhưng dữ liệu từ vựng chưa hợp lệ." }, { status: 422 });
    }
    return NextResponse.json({ message: error instanceof Error ? error.message : "Không thể đọc tài liệu." }, { status: 500 });
  }
}
