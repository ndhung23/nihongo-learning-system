import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requirePermission } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { DeckModel } from "@/models/Deck";
import { VocabularyModel } from "@/models/Vocabulary";

const VocabularyPayloadSchema = z.object({
  term: z.string().trim().min(1),
  kana: z.string().trim().optional(),
  romaji: z.string().trim().optional(),
  meaningVi: z.string().trim().min(1),
  partOfSpeech: z.string().trim().optional(),
  level: z.enum(["kana", "n5", "n4", "n3", "n2", "n1", "custom"]).optional(),
  lesson: z.coerce.number().int().min(1).max(99).optional(),
  isPublished: z.boolean().default(true),
  examples: z
    .array(
      z.object({
        ja: z.string().trim().min(1),
        vi: z.string().trim().optional(),
      }),
    )
    .default([]),
});

const ImportPayloadSchema = z.object({
  importText: z.string().trim().min(1),
  lesson: z.coerce.number().int().min(1).max(99).optional(),
  level: z.enum(["kana", "n5", "n4", "n3", "n2", "n1", "custom"]).optional(),
  isPublished: z.boolean().default(true),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requirePermission("admin:vocabulary:read");
    await connectMongoDB();

    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "ID khóa học không hợp lệ." }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    const lesson = searchParams.get("lesson");
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 50), 10), 200);
    const filter: Record<string, unknown> = { deckId: id };

    if (lesson && lesson !== "all") {
      const lessonNumber = Number(lesson);
      if (Number.isInteger(lessonNumber) && lessonNumber > 0) {
        filter.lesson = lessonNumber;
      }
    }

    if (q) {
      const safeQuery = escapeRegex(q);
      filter.$or = [
        { term: { $regex: safeQuery, $options: "i" } },
        { kana: { $regex: safeQuery, $options: "i" } },
        { romaji: { $regex: safeQuery, $options: "i" } },
        { meaningVi: { $regex: safeQuery, $options: "i" } },
      ];
    }

    const vocabulary = await VocabularyModel.find(filter)
      .sort({ lesson: 1, createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ data: vocabulary });
  } catch (error) {
    return handleError(error, "Không thể tải từ vựng.");
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await requirePermission("admin:vocabulary:create");
    await connectMongoDB();

    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "ID khóa học không hợp lệ." }, { status: 400 });
    }

    const deck = await DeckModel.findById(id).lean();

    if (!deck) {
      return NextResponse.json({ message: "Không tìm thấy khóa học." }, { status: 404 });
    }

    const rawPayload = await request.json();

    if (typeof rawPayload.importText === "string") {
      const payload = ImportPayloadSchema.parse(rawPayload);
      const rows = parseImportText(payload.importText);

      if (rows.length === 0) {
        return NextResponse.json({ message: "Không tìm thấy dòng import hợp lệ." }, { status: 400 });
      }

      const vocabularyLevel = normalizeVocabularyLevel(payload.level || deck.level || "custom");
      const operations = rows.map((row) => ({
        updateOne: {
          filter: { deckId: new Types.ObjectId(id), term: row.term },
          update: {
            $set: {
              deckId: new Types.ObjectId(id),
              term: row.term,
              kana: row.kana,
              romaji: row.romaji,
              meaningVi: row.meaningVi,
              level: vocabularyLevel,
              lesson: row.lesson ?? payload.lesson,
              source: "system",
              isPublished: payload.isPublished,
              examples: row.example ? [{ ja: row.example }] : [],
              tags: [String(deck.level || "custom").toUpperCase(), deck.title].filter(Boolean),
            },
          },
          upsert: true,
        },
      }));

      await VocabularyModel.bulkWrite(operations);
      await syncVocabularyCount(id);

      return NextResponse.json({ data: { imported: rows.length } }, { status: 201 });
    }

    const payload = VocabularyPayloadSchema.parse(rawPayload);
    const vocabulary = await VocabularyModel.create({
      ...payload,
      deckId: id,
      level: normalizeVocabularyLevel(payload.level || deck.level || "custom"),
      source: "system",
      tags: [String(deck.level || "custom").toUpperCase(), deck.title].filter(Boolean),
    });

    await syncVocabularyCount(id);

    return NextResponse.json({ data: vocabulary }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Dữ liệu từ vựng không hợp lệ.", issues: error.issues }, { status: 400 });
    }

    return handleError(error, "Không thể lưu từ vựng.");
  }
}

function parseImportText(importText: string) {
  const rows: Array<{ term: string; kana?: string; romaji?: string; meaningVi: string; example?: string; lesson?: number }> = [];
  const content = importText.replace(/^```(?:json|csv)?\s*/i, "").replace(/\s*```$/, "").trim();

  if (content.startsWith("{") || content.startsWith("[")) {
    try {
      const parsed = JSON.parse(content) as unknown;
      const items = Array.isArray(parsed)
        ? parsed
        : (parsed as { words?: unknown; vocabulary?: unknown }).words ||
          (parsed as { vocabulary?: unknown }).vocabulary;
      if (!Array.isArray(items)) return rows;
      items.forEach((item) => {
        if (!item || typeof item !== "object") return;
        const word = item as Record<string, unknown>;
        const term = String(word.term ?? "").trim();
        const meaningVi = String(word.meaningVi ?? word.meaning ?? "").trim();
        const examples = Array.isArray(word.examples) ? word.examples : [];
        const firstExample = examples[0];
        const example = typeof firstExample === "string"
          ? firstExample
          : firstExample && typeof firstExample === "object"
            ? String((firstExample as Record<string, unknown>).ja ?? "")
            : String(word.example ?? "");
        if (term && meaningVi) {
          const lesson = Number(word.lesson);
          rows.push({
            term,
            kana: String(word.kana ?? "").trim(),
            romaji: String(word.romaji ?? "").trim(),
            meaningVi,
            example: example.trim(),
            lesson: Number.isInteger(lesson) && lesson > 0 && lesson <= 99 ? lesson : undefined,
          });
        }
      });
      return rows;
    } catch {
      return rows;
    }
  }

  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const firstLine = lines[0]?.toLowerCase() || "";
  const hasHeader = firstLine.includes("term") && (firstLine.includes("meaningvi") || firstLine.includes("meaning"));
  const headers = hasHeader ? lines.shift()!.split(",").map((item) => item.trim()) : [];

  lines
    .forEach((line) => {
      const parts = line.includes("|") ? line.split("|") : line.includes(",") ? line.split(",") : line.split(/\s+/);
      if (hasHeader) {
        const values = parts.map((part) => part.trim());
        const record = Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
        const term = record.term;
        const meaningVi = record.meaningVi || record.meaning;
        if (term && meaningVi) {
          const lesson = Number(record.lesson);
          rows.push({
            term,
            kana: record.kana,
            romaji: record.romaji,
            meaningVi,
            example: record.example,
            lesson: Number.isInteger(lesson) && lesson > 0 && lesson <= 99 ? lesson : undefined,
          });
        }
        return;
      }
      const [term, kana, romaji, meaningVi, ...exampleParts] = parts.map((part) => part.trim());
      const example = exampleParts.join(" ").trim();

      if (term && meaningVi) {
        rows.push({ term, kana, romaji, meaningVi, example });
      }
    });

  return rows;
}

function normalizeVocabularyLevel(level: unknown) {
  return ["kana", "n5", "n4", "n3", "n2", "n1", "custom"].includes(String(level)) ? String(level) : "custom";
}

async function syncVocabularyCount(deckId: string) {
  const vocabularyCount = await VocabularyModel.countDocuments({ deckId });
  await DeckModel.findByIdAndUpdate(deckId, { $set: { "stats.vocabularyCount": vocabularyCount } });
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function handleError(error: unknown, fallback: string) {
  if (error instanceof AuthError) {
    return NextResponse.json(
      { message: error.message, code: error.code },
      { status: error.code === "UNAUTHORIZED" ? 401 : 403 },
    );
  }

  return NextResponse.json({ message: error instanceof Error ? error.message : fallback }, { status: 500 });
}
