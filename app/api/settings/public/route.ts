import { NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { SystemSettingModel } from "@/models/SystemSetting";

export async function GET() {
  const paymentBank = {
    paymentBankCode: process.env.PAYMENT_BANK_CODE?.trim() || "",
    paymentBankAccount: process.env.PAYMENT_BANK_ACCOUNT?.trim() || "",
    paymentBankVirtualAccount: process.env.PAYMENT_BANK_VIRTUAL_ACCOUNT?.trim() || "",
    paymentBankAccountName: process.env.PAYMENT_BANK_ACCOUNT_NAME?.trim() || "",
  };
  try {
    await connectMongoDB();
    const settings = await SystemSettingModel.find({ isPublic: true }).select("key value -_id").lean();
    return NextResponse.json({ data: { ...Object.fromEntries(settings.map((item) => [item.key, item.value])), ...paymentBank } });
  } catch {
    return NextResponse.json({ data: paymentBank });
  }
}
