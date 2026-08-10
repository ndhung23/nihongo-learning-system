import mongoose, { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { AuthError, requirePermission } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { getMasterDataResource } from "@/lib/admin/master-data";
import { writeAudit } from "@/lib/admin/audit";

export async function GET(request: NextRequest, context: RouteContext<"/api/admin/master-data/[resource]">) {
  try {
    await requirePermission("admin:master-data:read"); const { resource: key } = await context.params; const config = getMasterDataResource(key);
    if (!config) return NextResponse.json({ message: "Nguồn dữ liệu không được phép." }, { status: 404 });
    await connectMongoDB(); const page = clamp(request.nextUrl.searchParams.get("page"), 1, 9999, 1); const limit = clamp(request.nextUrl.searchParams.get("limit"), 5, 50, 20); const q = (request.nextUrl.searchParams.get("q") || "").slice(0, 100); const filterField = request.nextUrl.searchParams.get("filterField") || ""; const filterValue = (request.nextUrl.searchParams.get("filterValue") || "").slice(0, 80);
    const filter: Record<string, unknown> = {};
    if (q && config.searchFields.length) filter.$or = config.searchFields.map((field) => ({ [field]: { $regex: escapeRegex(q), $options: "i" } }));
    if (config.filterFields.includes(filterField) && filterValue) filter[filterField] = filterValue === "true" ? true : filterValue === "false" ? false : filterValue;
    const collection = mongoose.connection.collection(config.collection); const projection = Object.fromEntries(config.fields.map((field) => [field, 1]));
    const [items, total] = await Promise.all([collection.find(filter, { projection }).sort({ _id: -1 }).skip((page - 1) * limit).limit(limit).toArray(), collection.countDocuments(filter)]);
    return NextResponse.json({ data: items, config: { ...config, collection: undefined }, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
  } catch (error) { return handle(error); }
}
export async function PATCH(request: NextRequest, context: RouteContext<"/api/admin/master-data/[resource]">) {
  try {
    const session = await requirePermission("admin:master-data:update"); const { resource: key } = await context.params; const config = getMasterDataResource(key); if (!config) return NextResponse.json({ message: "Nguồn dữ liệu không được phép." }, { status: 404 });
    const body = await request.json() as { id?: string; values?: Record<string, unknown> }; if (!body.id || !Types.ObjectId.isValid(body.id)) return NextResponse.json({ message: "ID không hợp lệ." }, { status: 400 });
    const values = Object.fromEntries(Object.entries(body.values || {}).filter(([field]) => config.editableFields.includes(field))); if (!Object.keys(values).length) return NextResponse.json({ message: "Không có trường được phép cập nhật." }, { status: 400 });
    if (Object.values(values).some((value) => value && typeof value === "object")) return NextResponse.json({ message: "Giá trị cập nhật không hợp lệ." }, { status: 400 });
    await connectMongoDB(); const collection = mongoose.connection.collection(config.collection); const before = await collection.findOne({ _id: new Types.ObjectId(body.id) }); await collection.updateOne({ _id: new Types.ObjectId(body.id) }, { $set: values }); await writeAudit(session.userId, "MASTER_DATA_UPDATE", key, body.id, before, values); return NextResponse.json({ message: "Đã cập nhật dữ liệu." });
  } catch (error) { return handle(error); }
}
export async function DELETE(_request: NextRequest, context: RouteContext<"/api/admin/master-data/[resource]">) {
  try {
    const session = await requirePermission("admin:master-data:delete"); const { resource: key } = await context.params; const config = getMasterDataResource(key); if (!config || !config.canDelete) return NextResponse.json({ message: "Không được phép xóa nguồn dữ liệu này." }, { status: 403 }); const id = _request.nextUrl.searchParams.get("id") || ""; if (!Types.ObjectId.isValid(id)) return NextResponse.json({ message: "ID không hợp lệ." }, { status: 400 }); await connectMongoDB(); const collection = mongoose.connection.collection(config.collection); const before = await collection.findOne({ _id: new Types.ObjectId(id) }); await collection.deleteOne({ _id: new Types.ObjectId(id) }); await writeAudit(session.userId, "MASTER_DATA_DELETE", key, id, before, undefined); return NextResponse.json({ message: "Đã xóa bản ghi." });
  } catch (error) { return handle(error); }
}
function clamp(value: string | null, min: number, max: number, fallback: number) { const parsed = Number(value); return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.floor(parsed))) : fallback; }
function escapeRegex(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function handle(error: unknown) { if (error instanceof AuthError) return NextResponse.json({ message: error.message }, { status: error.code === "UNAUTHORIZED" ? 401 : 403 }); return NextResponse.json({ message: error instanceof Error ? error.message : "Không thể xử lý Master Data." }, { status: 500 }); }
