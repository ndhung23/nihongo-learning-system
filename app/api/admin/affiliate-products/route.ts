import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requirePermission } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { AffiliateProductModel } from "@/models/AffiliateProduct";

export const AffiliateProductInput = z.object({
  title: z.string().trim().min(2).max(160), description: z.string().trim().max(1200).default(""),
  level: z.string().trim().max(40).default(""), imageUrl: z.union([z.literal(""), z.string().url().max(2000)]).default(""),
  affiliateUrl: z.union([z.literal(""), z.string().url().max(2000)]).default(""), price: z.coerce.number().min(0).nullable().optional(),
  originalPrice: z.coerce.number().min(0).nullable().optional(), accent: z.enum(["rose", "teal", "violet", "amber", "blue"]).default("rose"),
  isActive: z.boolean().default(false), sortOrder: z.coerce.number().int().min(-9999).max(9999).default(0),
});

export async function GET() { try { await requirePermission("admin:affiliate-product:read"); await connectMongoDB(); return NextResponse.json({ data: await AffiliateProductModel.find().sort({ sortOrder: 1, createdAt: -1 }).lean() }); } catch (error) { return apiError(error); } }
export async function POST(request: NextRequest) { try { const admin = await requirePermission("admin:affiliate-product:create"); const payload = AffiliateProductInput.parse(await request.json()); await connectMongoDB(); const data = await AffiliateProductModel.create({ ...payload, price: payload.price ?? undefined, originalPrice: payload.originalPrice ?? undefined, createdBy: admin.userId, updatedBy: admin.userId }); return NextResponse.json({ data }, { status: 201 }); } catch (error) { return apiError(error); } }

export function apiError(error: unknown) {
  if (error instanceof AuthError) return NextResponse.json({ message: error.message }, { status: error.code === "UNAUTHORIZED" ? 401 : 403 });
  if (error instanceof z.ZodError) return NextResponse.json({ message: error.issues[0]?.message || "Dữ liệu sản phẩm không hợp lệ." }, { status: 400 });
  return NextResponse.json({ message: error instanceof Error ? error.message : "Không thể xử lý sản phẩm." }, { status: 500 });
}
