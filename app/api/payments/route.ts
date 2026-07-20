import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requireAuth } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { PaymentRequestModel } from "@/models/PaymentRequest";

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

    if (payload.amount % 1000 !== 0) {
      return NextResponse.json({ message: "Số tiền phải chia hết cho 1.000đ." }, { status: 400 });
    }
    if (payload.kind === "vip" && payload.amount % 20_000 !== 0) {
      return NextResponse.json({ message: "VIP có giá 20.000đ cho mỗi tháng." }, { status: 400 });
    }

    await connectMongoDB();
    const prefix = payload.kind === "vip" ? "VIP" : "AI";
    const transferCode = `${prefix}${session.userId.slice(-4)}${randomUUID().replaceAll("-", "").slice(0, 8)}`.toUpperCase();
    const payment = await PaymentRequestModel.create({
      userId: session.userId,
      kind: payload.kind,
      amount: payload.amount,
      aiCredits: payload.kind === "ai" ? payload.amount / 1000 : (payload.amount / 20_000) * 100,
      vipMonths: payload.kind === "vip" ? payload.amount / 20_000 : 0,
      transferCode,
    });

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
