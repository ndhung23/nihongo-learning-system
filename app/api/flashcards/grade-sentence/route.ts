import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { AuthError, requireAuth } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { AiLearningCacheModel } from "@/models/AiLearningCache";
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
    const userObjectId = new Types.ObjectId(session.userId);

    if (deepLearnRequest.success) {
      const cacheKey = buildCacheKey(
        deepLearnRequest.data.kind,
        deepLearnRequest.data.word.term,
        deepLearnRequest.data.word.meaning,
      );
      const cached = await AiLearningCacheModel.findOne({ cacheKey }).lean();
      if (cached) {
        const account = await UserModel.collection.findOne(
          { _id: userObjectId },
          { projection: { aiCredits: 1 } },
        );
        return NextResponse.json({
          data: DeepLearnResponseSchema.parse(cached.result),
          cached: true,
          provider: cached.provider,
          remainingAiCredits: Number(account?.aiCredits) || 0,
        });
      }
    }

    await UserModel.collection.updateOne(
      { _id: userObjectId, aiCredits: { $exists: false } },
      { $set: { aiCredits: 1 } },
    );
    const account = await UserModel.collection.findOneAndUpdate(
      { _id: userObjectId, aiCredits: { $gt: 0 } },
      { $inc: { aiCredits: -1 } },
      { returnDocument: "after", projection: { aiCredits: 1 } },
    );

    if (!account) {
      return NextResponse.json(
        { message: "Bạn đã hết lượt AI. Hãy quay Gacha để nhận thêm lượt.", code: "NO_AI_CREDITS" },
        { status: 402 },
      );
    }
    debitedUserId = session.userId;

    const generated = await generateAiJson(
      prompt,
      deepLearnRequest.success ? DeepLearnResponseSchema : GeminiResponseSchema,
    );
    const parsed = generated.data;

    if (deepLearnRequest.success) {
      const cacheKey = buildCacheKey(
        deepLearnRequest.data.kind,
        deepLearnRequest.data.word.term,
        deepLearnRequest.data.word.meaning,
      );
      await AiLearningCacheModel.findOneAndUpdate(
        { cacheKey },
        {
          $setOnInsert: {
            cacheKey,
            term: deepLearnRequest.data.word.term,
            kind: deepLearnRequest.data.kind,
            result: parsed,
            provider: generated.provider,
            model: generated.model,
          },
        },
        { upsert: true },
      );
    }

    debitedUserId = null;
    return NextResponse.json({
      data: parsed,
      cached: false,
      provider: generated.provider,
      remainingAiCredits: account.aiCredits,
    });
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
  await UserModel.collection.updateOne(
    { _id: new Types.ObjectId(userId) },
    { $inc: { aiCredits: 1 } },
  );
}

function buildCacheKey(kind: string, term: string, meaning?: string) {
  return [kind, term, meaning || ""]
    .map((value) => value.trim().toLocaleLowerCase("ja"))
    .join("::");
}

async function generateAiJson(prompt: string, schema: z.ZodType<unknown>) {
  const errors: string[] = [];
  const geminiKeys = uniqueKeys([
    process.env.GEMINI_API_KEY,
    process.env.APIKEYGEMINI,
    process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  ]);
  const geminiModel = process.env.GEMINI_MODEL || "gemini-3.5-flash";

  for (const apiKey of geminiKeys) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.25,
            },
            contents: [{ role: "user", parts: [{ text: prompt }] }],
          }),
          signal: AbortSignal.timeout(30_000),
        },
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof text !== "string") throw new Error("Phản hồi không có nội dung");
      return {
        data: schema.parse(JSON.parse(text)),
        provider: "gemini",
        model: geminiModel,
      };
    } catch (error) {
      errors.push(`Gemini: ${error instanceof Error ? error.message : "lỗi"}`);
    }
  }

  const openAiKeys = uniqueKeys([
    process.env.OPENAI_API_KEY,
    process.env.keychatgpt,
    process.env.CHATGPT_API_KEY,
  ]);
  const openAiModel = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  for (const apiKey of openAiKeys) {
    try {
      const text = await callOpenAiCompatible(
        "https://api.openai.com/v1/chat/completions",
        apiKey,
        openAiModel,
        prompt,
      );
      return {
        data: schema.parse(JSON.parse(text)),
        provider: "openai",
        model: openAiModel,
      };
    } catch (error) {
      errors.push(`OpenAI: ${error instanceof Error ? error.message : "lỗi"}`);
    }
  }

  const deepSeekKeys = uniqueKeys([
    process.env.DEEPSEEK_API_KEY,
    process.env.DEEPSEEK_KEY,
  ]);
  const deepSeekModel = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  for (const apiKey of deepSeekKeys) {
    try {
      const text = await callOpenAiCompatible(
        "https://api.deepseek.com/chat/completions",
        apiKey,
        deepSeekModel,
        prompt,
      );
      return {
        data: schema.parse(JSON.parse(text)),
        provider: "deepseek",
        model: deepSeekModel,
      };
    } catch (error) {
      errors.push(`DeepSeek: ${error instanceof Error ? error.message : "lỗi"}`);
    }
  }

  throw new Error(
    errors.length > 0
      ? `Các nhà cung cấp AI đều tạm thời không phản hồi (${errors.join("; ")}).`
      : "Chưa cấu hình API key cho Gemini, OpenAI hoặc DeepSeek.",
  );
}

async function callOpenAiCompatible(
  endpoint: string,
  apiKey: string,
  model: string,
  prompt: string,
) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.25,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string") throw new Error("Phản hồi không có nội dung");
  return text;
}

function uniqueKeys(keys: Array<string | undefined>) {
  return Array.from(new Set(keys.filter((key): key is string => Boolean(key?.trim()))));
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
