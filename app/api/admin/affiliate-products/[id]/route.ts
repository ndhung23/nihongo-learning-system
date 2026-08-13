import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { AffiliateProductModel } from "@/models/AffiliateProduct";
import { AffiliateProductInput, apiError } from "../route";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const admin = await requirePermission("admin:affiliate-product:update"); const { id } = await params; if (!Types.ObjectId.isValid(id)) return NextResponse.json({ message: "Mã sản phẩm không hợp lệ." }, { status: 400 }); const payload = AffiliateProductInput.parse(await request.json()); await connectMongoDB(); const data = await AffiliateProductModel.findByIdAndUpdate(id, { ...payload, price: payload.price ?? undefined, originalPrice: payload.originalPrice ?? undefined, updatedBy: admin.userId }, { new: true, runValidators: true }); if (!data) return NextResponse.json({ message: "Không tìm thấy sản phẩm." }, { status: 404 }); return NextResponse.json({ data }); } catch (error) { return apiError(error); }
}
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requirePermission("admin:affiliate-product:delete"); const { id } = await params; if (!Types.ObjectId.isValid(id)) return NextResponse.json({ message: "Mã sản phẩm không hợp lệ." }, { status: 400 }); await connectMongoDB(); const data = await AffiliateProductModel.findByIdAndDelete(id); if (!data) return NextResponse.json({ message: "Không tìm thấy sản phẩm." }, { status: 404 }); return NextResponse.json({ ok: true }); } catch (error) { return apiError(error); }
}
