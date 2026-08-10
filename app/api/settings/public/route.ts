import { NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { SystemSettingModel } from "@/models/SystemSetting";

export async function GET() {
  try {
    await connectMongoDB();
    const settings = await SystemSettingModel.find({ isPublic: true }).select("key value -_id").lean();
    return NextResponse.json({ data: Object.fromEntries(settings.map((item) => [item.key, item.value])) });
  } catch {
    return NextResponse.json({ data: {} });
  }
}
