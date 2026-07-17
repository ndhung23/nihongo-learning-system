import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requirePermission } from "@/lib/auth/session";

const GradeSentenceSchema = z.object({
  sentence: z.string().trim().min(1).max(500),
  word: z.object({
    term: z.string().trim().min(1),
    kana: z.string().optional(),
    romaji: z.string().optional(),
    meaning: z.string().optional(),
    example: z.string().optional(),
    exampleVi: z.string().optional(),
  }),
});

const GeminiResponseSchema = z.object({
  score: z.number().min(0).max(100),
  isNatural: z.boolean(),
  correctedSentence: z.string(),
  naturalSentence: z.string(),
  feedbackVi: z.string(),
  grammarNotes: z.array(z.string()).default([]),
  vocabularyHints: z.array(z.string()).default([]),
});

export async function POST(request: NextRequest) {
  try {
    await requirePermission("ai:use");

    const apiKey = process.env.APIKEYGEMINI || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ message: "Ch\u01b0a c\u1ea5u h\u00ecnh Gemini API key." }, { status: 500 });
    }

    const payload = GradeSentenceSchema.parse(await request.json());
    const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.25,
        },
        contents: [
          {
            role: "user",
            parts: [{ text: buildPrompt(payload.sentence, payload.word) }],
          },
        ],
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      return NextResponse.json({ message: "Gemini ch\u01b0a ch\u1ea5m \u0111\u01b0\u1ee3c c\u00e2u n\u00e0y.", details }, { status: 502 });
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (typeof text !== "string") {
      return NextResponse.json({ message: "Gemini tr\u1ea3 v\u1ec1 ph\u1ea3n h\u1ed3i kh\u00f4ng h\u1ee3p l\u1ec7." }, { status: 502 });
    }

    const parsed = GeminiResponseSchema.parse(JSON.parse(text));

    return NextResponse.json({ data: parsed });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message, code: error.code }, { status: error.code === "UNAUTHORIZED" ? 401 : 403 });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "D\u1eef li\u1ec7u ch\u1ea5m c\u00e2u kh\u00f4ng h\u1ee3p l\u1ec7.", issues: error.issues }, { status: 400 });
    }

    return NextResponse.json({ message: error instanceof Error ? error.message : "Kh\u00f4ng th\u1ec3 ch\u1ea5m c\u00e2u." }, { status: 500 });
  }
}

function buildPrompt(sentence: string, word: z.infer<typeof GradeSentenceSchema>["word"]) {
  return `
You are a Japanese teacher for Vietnamese learners. Grade the learner's Japanese sentence.

Target vocabulary:
- Japanese: ${word.term}
- Kana: ${word.kana || ""}
- Romaji: ${word.romaji || ""}
- Vietnamese meaning: ${word.meaning || ""}
- Reference example: ${word.example || ""}
- Reference meaning: ${word.exampleVi || ""}

Learner sentence:
${sentence}

Return only valid JSON with this shape:
{
  "score": number from 0 to 100,
  "isNatural": boolean,
  "correctedSentence": "corrected Japanese sentence, keep original if already correct",
  "naturalSentence": "a more natural Japanese sentence using the target vocabulary",
  "feedbackVi": "short Vietnamese feedback, friendly and specific",
  "grammarNotes": ["Vietnamese note 1", "Vietnamese note 2"],
  "vocabularyHints": ["Vietnamese vocabulary hint 1"]
}
`.trim();
}
