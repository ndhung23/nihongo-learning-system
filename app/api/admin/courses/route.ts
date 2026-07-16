import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requirePermission } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { DeckModel } from "@/models/Deck";

const levels = ["kana", "n5", "n4", "n3", "n2", "n1", "it", "custom"] as const;
const sourceTypes = ["system", "user", "ai"] as const;
const visibilities = ["private", "public", "unlisted"] as const;
const statuses = ["draft", "pending_review", "published", "rejected", "hidden", "archived"] as const;

const CreateCourseSchema = z.object({
  title: z.string().min(2).max(120),
  slug: z.string().min(2).max(140).optional(),
  description: z.string().max(1000).optional(),
  level: z.enum(levels).default("custom"),
  sourceType: z.enum(sourceTypes).default("system"),
  visibility: z.enum(visibilities).default("private"),
  status: z.enum(statuses).default("draft"),
  sourceLanguage: z.string().min(2).max(12).default("ja"),
  targetLanguage: z.string().min(2).max(12).default("vi"),
  ownerId: z.string().optional(),
  priceAmount: z.coerce.number().min(0).default(0),
  priceCurrency: z.string().min(2).max(8).default("VND"),
  tags: z.array(z.string().min(1).max(32)).default([]),
});

export async function GET(request: NextRequest) {
  try {
    await requirePermission("admin:course:read");
    await connectMongoDB();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    const level = searchParams.get("level");
    const sourceType = searchParams.get("sourceType");
    const visibility = searchParams.get("visibility");
    const status = searchParams.get("status");
    const page = clampNumber(searchParams.get("page"), 1, 9999, 1);
    const limit = clampNumber(searchParams.get("limit"), 5, 50, 10);
    const filter: Record<string, unknown> = {};

    if (q) {
      const safeQuery = escapeRegex(q);
      filter.$or = [
        { title: { $regex: safeQuery, $options: "i" } },
        { slug: { $regex: safeQuery, $options: "i" } },
        { description: { $regex: safeQuery, $options: "i" } },
        { tags: { $regex: safeQuery, $options: "i" } },
      ];
    }

    if (levels.includes(level as (typeof levels)[number])) {
      filter.level = level;
    }

    if (sourceTypes.includes(sourceType as (typeof sourceTypes)[number])) {
      filter.sourceType = sourceType;
    }

    if (visibilities.includes(visibility as (typeof visibilities)[number])) {
      filter.visibility = visibility;
    }

    if (statuses.includes(status as (typeof statuses)[number])) {
      filter.status = status;
    }

    const [courses, total] = await Promise.all([
      DeckModel.find(filter)
        .populate("ownerId", "username email displayName")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      DeckModel.countDocuments(filter),
    ]);

    return NextResponse.json({
      data: courses,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { message: error.message, code: error.code },
        { status: error.code === "UNAUTHORIZED" ? 401 : 403 },
      );
    }

    return NextResponse.json({ message: error instanceof Error ? error.message : "Không thể tải danh sách khóa học." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission("admin:course:write");
    await connectMongoDB();

    const payload = CreateCourseSchema.parse(await request.json());
    const slug = normalizeSlug(payload.slug || payload.title);
    const existed = await DeckModel.exists({ slug });

    if (existed) {
      return NextResponse.json({ message: "Slug khóa học đã tồn tại." }, { status: 409 });
    }

    const ownerId = payload.ownerId && Types.ObjectId.isValid(payload.ownerId)
      ? payload.ownerId
      : payload.sourceType === "user"
        ? session.userId
        : undefined;

    const course = await DeckModel.create({
      title: payload.title.trim(),
      slug,
      description: payload.description?.trim() || "",
      level: payload.level,
      sourceType: payload.sourceType,
      ownerId,
      visibility: payload.visibility,
      status: payload.status,
      languagePair: {
        source: payload.sourceLanguage.trim().toLowerCase(),
        target: payload.targetLanguage.trim().toLowerCase(),
      },
      price: {
        amount: payload.priceAmount,
        currency: payload.priceCurrency.trim().toUpperCase(),
      },
      tags: uniqueTags(payload.tags),
    });

    const data = await DeckModel.findById(course._id).populate("ownerId", "username email displayName").lean();

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { message: error.message, code: error.code },
        { status: error.code === "UNAUTHORIZED" ? 401 : 403 },
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Dữ liệu tạo khóa học không hợp lệ.", issues: error.issues }, { status: 400 });
    }

    return NextResponse.json({ message: error instanceof Error ? error.message : "Không thể tạo khóa học." }, { status: 500 });
  }
}

function clampNumber(value: string | null, min: number, max: number, fallback: number) {
  const numberValue = Number(value || fallback);

  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.floor(numberValue)));
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140);
}

function uniqueTags(tags: string[]) {
  return Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean))).slice(0, 20);
}
