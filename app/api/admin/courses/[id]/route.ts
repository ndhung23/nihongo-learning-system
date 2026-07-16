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

const UpdateCourseSchema = z.object({
  title: z.string().min(2).max(120).optional(),
  slug: z.string().min(2).max(140).optional(),
  description: z.string().max(1000).optional(),
  level: z.enum(levels).optional(),
  sourceType: z.enum(sourceTypes).optional(),
  visibility: z.enum(visibilities).optional(),
  status: z.enum(statuses).optional(),
  sourceLanguage: z.string().min(2).max(12).optional(),
  targetLanguage: z.string().min(2).max(12).optional(),
  ownerId: z.string().optional(),
  priceAmount: z.coerce.number().min(0).optional(),
  priceCurrency: z.string().min(2).max(8).optional(),
  tags: z.array(z.string().min(1).max(32)).optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await requirePermission("admin:course:write");
    await connectMongoDB();

    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "ID khóa học không hợp lệ." }, { status: 400 });
    }

    const payload = UpdateCourseSchema.parse(await request.json());
    const update: Record<string, unknown> = {};

    if (payload.title !== undefined) update.title = payload.title.trim();
    if (payload.description !== undefined) update.description = payload.description.trim();
    if (payload.level !== undefined) update.level = payload.level;
    if (payload.sourceType !== undefined) update.sourceType = payload.sourceType;
    if (payload.visibility !== undefined) update.visibility = payload.visibility;
    if (payload.status !== undefined) update.status = payload.status;
    if (payload.tags !== undefined) update.tags = uniqueTags(payload.tags);

    if (payload.slug !== undefined) {
      const slug = normalizeSlug(payload.slug);
      const existed = await DeckModel.exists({ slug, _id: { $ne: id } });

      if (existed) {
        return NextResponse.json({ message: "Slug khóa học đã tồn tại." }, { status: 409 });
      }

      update.slug = slug;
    }

    if (payload.sourceLanguage !== undefined || payload.targetLanguage !== undefined) {
      if (payload.sourceLanguage !== undefined) update["languagePair.source"] = payload.sourceLanguage.trim().toLowerCase();
      if (payload.targetLanguage !== undefined) update["languagePair.target"] = payload.targetLanguage.trim().toLowerCase();
    }

    if (payload.priceAmount !== undefined) update["price.amount"] = payload.priceAmount;
    if (payload.priceCurrency !== undefined) update["price.currency"] = payload.priceCurrency.trim().toUpperCase();

    if (payload.ownerId !== undefined) {
      update.ownerId = payload.ownerId && Types.ObjectId.isValid(payload.ownerId) ? payload.ownerId : undefined;
    }

    const course = await DeckModel.findByIdAndUpdate(id, { $set: update }, { new: true })
      .populate("ownerId", "username email displayName")
      .lean();

    if (!course) {
      return NextResponse.json({ message: "Không tìm thấy khóa học." }, { status: 404 });
    }

    return NextResponse.json({ data: course });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { message: error.message, code: error.code },
        { status: error.code === "UNAUTHORIZED" ? 401 : 403 },
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Dữ liệu cập nhật khóa học không hợp lệ.", issues: error.issues }, { status: 400 });
    }

    return NextResponse.json({ message: error instanceof Error ? error.message : "Không thể cập nhật khóa học." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    await requirePermission("admin:course:write");
    await connectMongoDB();

    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "ID khóa học không hợp lệ." }, { status: 400 });
    }

    const course = await DeckModel.findByIdAndDelete(id).lean();

    if (!course) {
      return NextResponse.json({ message: "Không tìm thấy khóa học." }, { status: 404 });
    }

    return NextResponse.json({ data: { id } });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { message: error.message, code: error.code },
        { status: error.code === "UNAUTHORIZED" ? 401 : 403 },
      );
    }

    return NextResponse.json({ message: error instanceof Error ? error.message : "Không thể xóa khóa học." }, { status: 500 });
  }
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
