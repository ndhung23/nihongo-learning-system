import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requireAuth } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";

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

const DeepLearnRequestSchema = z.object({
  action: z.literal("deep-learn"),
  kind: z.enum(["synonyms", "antonyms", "examples"]),
  word: z.object({
    term: z.string().trim().min(1).max(100),
    kana: z.string().optional(),
    romaji: z.string().optional(),
    meaning: z.string().optional(),
  }),
});

const DeepLearnResponseSchema = z.object({
  items: z.array(
    z.object({
      japanese: z.string(),
      kana: z.string().default(""),
      meaning: z.string(),
      note: z.string().default(""),
    }),
  ).max(6),
});

export async function POST(request: NextRequest) {
  let debitedUserId: string | null = null;

  try {
    const session = await requireAuth();

    const apiKey = process.env.GEMINI_API_KEY || process.env.APIKEYGEMINI || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ message: "Ch\u01b0a c\u1ea5u h\u00ecnh Gemini API key." }, { status: 500 });
    }

    const body: unknown = await request.json();
    const deepLearnRequest = DeepLearnRequestSchema.safeParse(body);
    let prompt: string;
    if (deepLearnRequest.success) {
      prompt = buildDeepLearnPrompt(deepLearnRequest.data.kind, deepLearnRequest.data.word);
    } else {
      const gradeRequest = GradeSentenceSchema.parse(body);
      prompt = buildPrompt(gradeRequest.sentence, gradeRequest.word);
    }

    await connectMongoDB();
    await UserModel.updateOne(
      { _id: session.userId, aiCredits: { $exists: false } },
      { $set: { aiCredits: 1 } },
    );
    const account = await UserModel.findOneAndUpdate(
      { _id: session.userId, aiCredits: { $gt: 0 } },
      { $inc: { aiCredits: -1 } },
      { new: true },
    ).select("aiCredits");

    if (!account) {
      return NextResponse.json(
        { message: "Bạn đã hết lượt AI. Hãy quay Gacha để nhận thêm lượt.", code: "NO_AI_CREDITS" },
        { status: 402 },
      );
    }
    debitedUserId = session.userId;

    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
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
            parts: [{
              text: prompt,
            }],
          },
        ],
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      await refundAiCredit(debitedUserId);
      debitedUserId = null;
      return NextResponse.json({ message: "Gemini ch\u01b0a ch\u1ea5m \u0111\u01b0\u1ee3c c\u00e2u n\u00e0y.", details }, { status: 502 });
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (typeof text !== "string") {
      await refundAiCredit(debitedUserId);
      debitedUserId = null;
      return NextResponse.json({ message: "Gemini tr\u1ea3 v\u1ec1 ph\u1ea3n h\u1ed3i kh\u00f4ng h\u1ee3p l\u1ec7." }, { status: 502 });
    }

    const parsed = deepLearnRequest.success
      ? DeepLearnResponseSchema.parse(JSON.parse(text))
      : GeminiResponseSchema.parse(JSON.parse(text));

    debitedUserId = null;
    return NextResponse.json({ data: parsed, remainingAiCredits: account.aiCredits });
  } catch (error) {
    if (debitedUserId) {
      await refundAiCredit(debitedUserId);
    }
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message, code: error.code }, { status: error.code === "UNAUTHORIZED" ? 401 : 403 });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "D\u1eef li\u1ec7u ch\u1ea5m c\u00e2u kh\u00f4ng h\u1ee3p l\u1ec7.", issues: error.issues }, { status: 400 });
    }

    return NextResponse.json({ message: error instanceof Error ? error.message : "Kh\u00f4ng th\u1ec3 ch\u1ea5m c\u00e2u." }, { status: 500 });
  }
}

async function refundAiCredit(userId: string) {
  await UserModel.updateOne({ _id: userId }, { $inc: { aiCredits: 1 } });
}

function buildDeepLearnPrompt(
  kind: z.infer<typeof DeepLearnRequestSchema>["kind"],
  word: z.infer<typeof DeepLearnRequestSchema>["word"],
) {
  const task = {
    synonyms: "List Japanese synonyms or near-synonyms. Explain briefly how their nuance differs from the target word.",
    antonyms: "List Japanese antonyms or useful semantic opposites. Do not invent an antonym when none exists.",
    examples: "Write natural Japanese example sentences using the target word in varied everyday contexts.",
  }[kind];

  return `
You are a careful Japanese teacher for Vietnamese learners.

Target word:
- Japanese: ${word.term}
- Kana: ${word.kana || ""}
- Romaji: ${word.romaji || ""}
- Vietnamese meaning: ${word.meaning || ""}

Task: ${task}
Return 3 to 5 useful items. For examples, "japanese" is the full Japanese sentence. For synonyms and antonyms, "japanese" is the vocabulary item.
All "meaning" and "note" fields must be concise Vietnamese. If there is no reliable item, return an empty items array.

Return only valid JSON:
{
  "items": [
    {
      "japanese": "Japanese word or sentence",
      "kana": "reading in kana",
      "meaning": "Vietnamese meaning",
      "note": "short nuance or grammar note in Vietnamese"
    }
  ]
}
`.trim();
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
