import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requirePermission } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { SystemSettingModel } from "@/models/SystemSetting";
import { writeAudit } from "@/lib/admin/audit";

const defaults = [
  { key: "siteName", value: "Nihongo Learning System", description: "Tên website", isPublic: true },
  { key: "allowRegistration", value: true, description: "Cho phép đăng ký", isPublic: true },
  { key: "maintenanceMode", value: false, description: "Chế độ bảo trì", isPublic: true },
  { key: "defaultLanguage", value: "vi", description: "Ngôn ngữ mặc định", isPublic: true },
  { key: "defaultPageSize", value: 20, description: "Số bản ghi mỗi trang", isPublic: false },
  { key: "aiCreditPriceVnd", value: 1000, description: "Giá một lượt AI (VNĐ)", isPublic: true },
  { key: "vipMonthlyPriceVnd", value: 20000, description: "Giá VIP mỗi tháng (VNĐ)", isPublic: true },
  { key: "vipMonthlyAiCredits", value: 100, description: "Lượt AI tặng mỗi tháng VIP", isPublic: true },
  { key: "gachaTicketChance", value: 25, description: "Tỉ lệ Gacha: +1 vé (%)", isPublic: true },
  { key: "gachaNoneChance", value: 25, description: "Tỉ lệ Gacha: chúc may mắn (%)", isPublic: true },
  { key: "gachaScratchChance", value: 0, description: "Tỉ lệ Gacha: thẻ cào 100K (%)", isPublic: true },
  { key: "gachaAiChance", value: 20, description: "Tỉ lệ Gacha: +1 lượt AI (%)", isPublic: true },
  { key: "gachaRetryChance", value: 15, description: "Tỉ lệ Gacha: quay lại (%)", isPublic: true },
  { key: "gachaCoinsChance", value: 15, description: "Tỉ lệ Gacha: nhận xu (%)", isPublic: true },
  { key: "gachaCoinsReward", value: 100, description: "Số xu nhận từ vòng quay", isPublic: true },
];
async function seed() { await connectMongoDB(); await SystemSettingModel.bulkWrite(defaults.map((item) => ({ updateOne: { filter: { key: item.key }, update: { $setOnInsert: { ...item, group: "general" } }, upsert: true } }))); }
export async function GET() { try { await requirePermission("admin:settings:read"); await seed(); return NextResponse.json({ data: await SystemSettingModel.find({ group: "general" }).sort({ key: 1 }).lean() }); } catch (error) { return handle(error); } }
export async function PATCH(request: NextRequest) {
  try {
    const session = await requirePermission("admin:settings:update"); await seed();
    const payload = z.object({ values: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])) }).parse(await request.json());
    const allowed = new Set(defaults.map((item) => item.key)); if (Object.keys(payload.values).some((key) => !allowed.has(key))) return NextResponse.json({ message: "Có cấu hình không được phép." }, { status: 400 });
    const numericKeys = defaults.filter((item) => typeof item.value === "number").map((item) => item.key);
    if (numericKeys.some((key) => key in payload.values && (!Number.isFinite(Number(payload.values[key])) || Number(payload.values[key]) < 0))) return NextResponse.json({ message: "Các giá trị số phải lớn hơn hoặc bằng 0." }, { status: 400 });
    const chanceKeys = ["gachaTicketChance", "gachaNoneChance", "gachaScratchChance", "gachaAiChance", "gachaRetryChance", "gachaCoinsChance"];
    const current = Object.fromEntries((await SystemSettingModel.find({ key: { $in: chanceKeys } }).lean()).map((item) => [item.key, Number(item.value)]));
    const chanceTotal = chanceKeys.reduce((total, key) => total + Number(payload.values[key] ?? current[key] ?? 0), 0);
    if (Math.abs(chanceTotal - 100) > 0.001) return NextResponse.json({ message: `Tổng tỉ lệ vòng quay phải bằng 100% (hiện tại ${chanceTotal}%).` }, { status: 400 });
    const before = await SystemSettingModel.find({ key: { $in: Object.keys(payload.values) } }).lean();
    await SystemSettingModel.bulkWrite(Object.entries(payload.values).map(([key, value]) => ({ updateOne: { filter: { key }, update: { $set: { value } } } })));
    await writeAudit(session.userId, "SYSTEM_SETTING_UPDATE", "system-setting", "general", before, payload.values);
    return NextResponse.json({ message: "Đã lưu cấu hình." });
  } catch (error) { return handle(error); }
}
function handle(error: unknown) { if (error instanceof AuthError) return NextResponse.json({ message: error.message }, { status: error.code === "UNAUTHORIZED" ? 401 : 403 }); if (error instanceof z.ZodError) return NextResponse.json({ message: "Dữ liệu cấu hình chưa hợp lệ." }, { status: 400 }); return NextResponse.json({ message: error instanceof Error ? error.message : "Không thể xử lý cấu hình." }, { status: 500 }); }
