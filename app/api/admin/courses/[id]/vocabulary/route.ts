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
    await requirePermission("admin:course:read");
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
    await requirePermission("admin:course:write");
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
              lesson: payload.lesson,
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
  const rows: Array<{ term: string; kana?: string; romaji?: string; meaningVi: string; example?: string }> = [];

  importText
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^\*\*|\*\*$/g, ""))
    .filter(Boolean)
    .forEach((line) => {
      const parts = line.includes("|") ? line.split("|") : line.includes(",") ? line.split(",") : line.split(/\s+/);
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
