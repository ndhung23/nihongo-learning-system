import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requirePermission } from "@/lib/auth/session";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MAX_FILES = 10;
const MAX_TOTAL_BYTES = 30 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf",
  "text/plain", "text/csv", "application/csv", "application/json",
]);

const ImportedQuestionSchema = z.object({
  group: z.string().trim().min(1).max(100).catch("Dạng câu hỏi"),
  instruction: z.string().trim().max(500).catch("Chọn đáp án đúng nhất"),
  prompt: z.string().trim().min(1).max(3000),
  highlightText: z.string().trim().max(300).catch(""),
  imageUrl: z.string().trim().catch(""),
  audioUrl: z.string().trim().catch(""),
  options: z.array(z.string().trim().min(1).max(500)).min(2).max(6),
  correctIndex: z.coerce.number().int().min(0),
  explanation: z.string().trim().max(2000).catch(""),
}).superRefine((question, context) => {
  if (question.correctIndex >= question.options.length) {
    context.addIssue({ code: "custom", path: ["correctIndex"], message: "Đáp án đúng không hợp lệ." });
  }
});

const ImportResultSchema = z.object({
  questions: z.array(ImportedQuestionSchema).min(1).max(100),
});

function getGeminiKeys() {
  return Array.from(new Set(
    Object.entries(process.env)
      .filter(([name, value]) =>
        Boolean(value) &&
        (name === "GEMINI_API_KEY" || name === "APIKEYGEMINI" ||
          name === "GOOGLE_GENERATIVE_AI_API_KEY" || /^GEMINI_API_KEY_\d+$/.test(name)),
      )
      .sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }))
      .map(([, value]) => value as string),
  ));
}

function responseText(payload: unknown) {
  const data = payload as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim() || "";
}

export async function POST(request: Request) {
  try {
    await requirePermission("admin:course:write");
    const formData = await request.formData();
    const uploadedFiles = formData.getAll("files").filter((item): item is File => item instanceof File);
    const legacyFile = formData.get("file");
    const files = uploadedFiles.length
      ? uploadedFiles
      : legacyFile instanceof File
        ? [legacyFile]
        : [];
    const level = String(formData.get("level") || "N5");
    const sectionValue = formData.get("section");
    const section = sectionValue === "grammarReading" ? "Ngữ pháp + Reading" : sectionValue === "listening" ? "Nghe hiểu" : "Từ vựng + Kanji";

    if (!files.length) {
      return NextResponse.json({ message: "Vui lòng chọn file hoặc ảnh đề thi." }, { status: 400 });
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json({ message: `Mỗi lần chỉ được chọn tối đa ${MAX_FILES} tệp.` }, { status: 400 });
    }
    const unsupportedFile = files.find((file) => !ALLOWED_TYPES.has(file.type));
    if (unsupportedFile) {
      return NextResponse.json(
        { message: `Tệp “${unsupportedFile.name}” không được hỗ trợ. Chỉ dùng JPG, PNG, WebP, GIF, PDF, TXT, CSV hoặc JSON.` },
        { status: 400 },
      );
    }
    const oversizedFile = files.find((file) => file.size > MAX_FILE_BYTES);
    if (oversizedFile) {
      return NextResponse.json({ message: `Tệp “${oversizedFile.name}” không được lớn hơn 12 MB.` }, { status: 413 });
    }
    if (files.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_BYTES) {
      return NextResponse.json({ message: "Tổng dung lượng các tệp không được lớn hơn 30 MB." }, { status: 413 });
    }

    const apiKeys = getGeminiKeys();
    if (!apiKeys.length) {
      return NextResponse.json({ message: "Chưa cấu hình API key Gemini để đọc file/ảnh." }, { status: 503 });
    }

    const fileParts = await Promise.all(files.map(async (file) => ({
      inlineData: {
        mimeType: file.type,
        data: Buffer.from(await file.arrayBuffer()).toString("base64"),
      },
    })));
    const prompt = [
      `Bạn đang số hóa câu hỏi trắc nghiệm JLPT cấp ${level}, phần "${section}".`,
      `Có ${files.length} tệp đính kèm theo thứ tự. Đọc toàn bộ và trích xuất TẤT CẢ câu hỏi nhìn thấy, không tạo câu trùng giữa các ảnh.`,
      "Giữ nguyên tiếng Nhật, dấu câu và thứ tự lựa chọn; bỏ số thứ tự 1), 2), A., B. ở đầu lựa chọn.",
      "Nếu đề có chỗ trống dạng （　） hoặc gạch dưới, giữ nguyên trong prompt.",
      "highlightText là đúng phần chữ được gạch chân/nhấn mạnh; nếu không có thì để chuỗi rỗng.",
      "group là dạng bài ngắn gọn, ví dụ: Cách đọc Kanji, Từ vựng, Ngữ pháp, Đọc hiểu.",
      "instruction mặc định là 'Chọn đáp án đúng nhất' nếu tài liệu không ghi.",
      "correctIndex bắt đầu từ 0. Nếu không kèm đáp án, hãy tự giải và chọn đáp án đúng nhất.",
      "explanation giải thích ngắn gọn bằng tiếng Việt; không chắc thì để chuỗi rỗng.",
      "imageUrl và audioUrl luôn để chuỗi rỗng; quản trị viên sẽ tải media lên sau.",
      "Chỉ trả JSON đúng schema, không thêm markdown.",
    ].join("\n");
    const models = Array.from(new Set([
      process.env.GEMINI_MODEL, "gemini-2.5-flash", "gemini-2.0-flash",
    ].filter((value): value is string => Boolean(value))));
    let lastError = "Gemini không thể đọc tài liệu.";

    for (const model of models) {
      for (const apiKey of apiKeys) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{
                  role: "user",
                  parts: [
                    { text: prompt },
                    ...fileParts,
                  ],
                }],
                generationConfig: {
                  responseMimeType: "application/json",
                  responseJsonSchema: {
                    type: "object",
                    properties: {
                      questions: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            group: { type: "string" },
                            instruction: { type: "string" },
                            prompt: { type: "string" },
                            highlightText: { type: "string" },
                            imageUrl: { type: "string" },
                            audioUrl: { type: "string" },
                            options: { type: "array", items: { type: "string" } },
                            correctIndex: { type: "integer" },
                            explanation: { type: "string" },
                          },
                          required: ["group", "instruction", "prompt", "highlightText", "imageUrl", "audioUrl", "options", "correctIndex", "explanation"],
                        },
                      },
                    },
                    required: ["questions"],
                  },
                  temperature: 0.1,
                  maxOutputTokens: 16_384,
                },
              }),
              signal: AbortSignal.timeout(60_000),
            },
          );
          if (!response.ok) {
            const detail = await response.text();
            lastError = `Gemini trả lỗi ${response.status}${detail ? `: ${detail.slice(0, 180)}` : ""}`;
            continue;
          }
          const text = responseText(await response.json());
          if (!text) {
            lastError = "Gemini không nhận ra câu hỏi nào trong tài liệu.";
            continue;
          }
          const parsed = ImportResultSchema.parse(JSON.parse(text));
          return NextResponse.json({ data: parsed });
        } catch (error) {
          lastError = error instanceof Error ? error.message : lastError;
        }
      }
    }
    return NextResponse.json({ message: lastError }, { status: 502 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.code === "UNAUTHORIZED" ? 401 : 403 },
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Đã đọc được tài liệu nhưng dữ liệu câu hỏi chưa hợp lệ. Hãy thử ảnh rõ hơn." },
        { status: 422 },
      );
    }
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Không thể đọc file/ảnh." },
      { status: 500 },
    );
  }
}
