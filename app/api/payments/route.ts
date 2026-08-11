import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requireAuth } from "@/lib/auth/session";
import { sendPaymentRequestAdminEmail } from "@/lib/email";
import { connectMongoDB } from "@/lib/mongodb";
import { PaymentRequestModel } from "@/models/PaymentRequest";
import { SystemSettingModel } from "@/models/SystemSetting";

const CreatePaymentSchema = z.object({
  kind: z.enum(["ai", "vip"]),
  amount: z.coerce.number().int().min(1000).max(10_000_000),
});

export async function GET() {
  try {
    const session = await requireAuth();
    await connectMongoDB();
    const requests = await PaymentRequestModel.find({ userId: session.userId })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
    return NextResponse.json({ data: requests.map(serializePayment) });
  } catch (error) {
    return paymentError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const payload = CreatePaymentSchema.parse(await request.json());
    await connectMongoDB();
    const pricing = Object.fromEntries((await SystemSettingModel.find({ key: { $in: ["aiCreditPriceVnd", "vipMonthlyPriceVnd", "vipMonthlyAiCredits"] } }).lean()).map((item) => [item.key, Number(item.value)]));
    const aiPrice = Math.max(pricing.aiCreditPriceVnd || 1000, 1);
    const vipPrice = Math.max(pricing.vipMonthlyPriceVnd || 20000, 1);
    const vipAiCredits = Math.max(pricing.vipMonthlyAiCredits ?? 100, 0);

    if (payload.kind === "ai" && payload.amount % aiPrice !== 0) {
      return NextResponse.json({ message: `Số tiền phải chia hết cho ${aiPrice.toLocaleString("vi-VN")}đ.` }, { status: 400 });
    }
    if (payload.kind === "vip" && payload.amount % vipPrice !== 0) {
      return NextResponse.json({ message: `VIP có giá ${vipPrice.toLocaleString("vi-VN")}đ cho mỗi tháng.` }, { status: 400 });
    }

    const transferCode = `DH${session.userId.slice(-4)}${randomUUID().replaceAll("-", "").slice(0, 6)}`.toUpperCase();
    const payment = await PaymentRequestModel.create({
      userId: session.userId,
      kind: payload.kind,
      amount: payload.amount,
      aiCredits: payload.kind === "ai" ? payload.amount / aiPrice : (payload.amount / vipPrice) * vipAiCredits,
      vipMonths: payload.kind === "vip" ? payload.amount / vipPrice : 0,
      transferCode,
    });

    try {
      await sendPaymentRequestAdminEmail({
        username: session.username,
        userEmail: session.email,
        kind: payload.kind,
        amount: payload.amount,
        transferCode,
        createdAt: payment.createdAt,
      });
    } catch (emailError) {
      console.error("Failed to send payment notification email:", emailError);
    }

    return NextResponse.json({ data: serializePayment(payment.toObject()) }, { status: 201 });
  } catch (error) {
    return paymentError(error);
  }
}

function serializePayment(payment: Record<string, unknown>) {
  return {
    id: String(payment._id),
    kind: payment.kind,
    amount: payment.amount,
    aiCredits: payment.aiCredits,
    vipMonths: payment.vipMonths,
    transferCode: payment.transferCode,
    status: payment.status,
    adminNote: payment.adminNote,
    createdAt: payment.createdAt,
    reviewedAt: payment.reviewedAt,
  };
}

function paymentError(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ message: error.message }, { status: 401 });
  }
  if (error instanceof z.ZodError) {
    return NextResponse.json({ message: error.issues[0]?.message || "Dữ liệu không hợp lệ." }, { status: 400 });
  }
  return NextResponse.json(
    { message: error instanceof Error ? error.message : "Không thể tạo yêu cầu thanh toán." },
    { status: 500 },
  );
}
