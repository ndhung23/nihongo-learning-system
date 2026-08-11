import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectMongoDB } from "@/lib/mongodb";
import { PaymentRequestModel } from "@/models/PaymentRequest";
import { UserModel } from "@/models/User";

const SePayPayloadSchema = z.object({
  id: z.union([z.string(), z.number()]),
  gateway: z.string().optional(),
  transactionDate: z.string().optional(),
  accountNumber: z.union([z.string(), z.number()]).optional(),
  code: z.string().nullish(),
  content: z.string().nullish(),
  description: z.string().nullish(),
  transferType: z.string(),
  transferAmount: z.coerce.number().positive(),
  referenceCode: z.string().nullish(),
});

export async function POST(request: NextRequest) {
  const secret = process.env.SEPAY_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ success: false, message: "Webhook chưa được cấu hình." }, { status: 503 });

  const authorization = request.headers.get("authorization") || "";
  const providedSecret = authorization.replace(/^Apikey\s+/i, "");
  if (!safeEqual(providedSecret, secret)) {
    return NextResponse.json({ success: false, message: "Không được phép." }, { status: 401 });
  }

  try {
    const payload = SePayPayloadSchema.parse(await request.json());
    if (payload.transferType.toLowerCase() !== "in") return acknowledged("Giao dịch không phải tiền vào.");

    const transactionId = String(payload.id);
    await connectMongoDB();

    const alreadyProcessed = await PaymentRequestModel.exists({ sepayTransactionId: transactionId });
    if (alreadyProcessed) return acknowledged("Giao dịch đã được xử lý.");

    const transferCode = extractTransferCode(payload.code, payload.content, payload.description);
    if (!transferCode) return acknowledged("Không tìm thấy mã thanh toán.");

    const payment = await PaymentRequestModel.findOne({ transferCode, status: "pending" }).lean();
    if (!payment) return acknowledged("Không tìm thấy yêu cầu thanh toán đang chờ.");
    if (Number(payment.amount) !== payload.transferAmount) return acknowledged("Số tiền không khớp yêu cầu.");

    const user = await UserModel.findById(payment.userId).select("vipUntil").lean();
    if (!user) throw new Error("Không tìm thấy người dùng của yêu cầu thanh toán.");

    const userUpdate: Record<string, unknown> = {
      $inc: { aiCredits: payment.aiCredits },
      $addToSet: { processedPaymentIds: payment._id },
    };
    if (payment.kind === "vip") {
      const vipUntil = user.vipUntil && new Date(user.vipUntil) > new Date() ? new Date(user.vipUntil) : new Date();
      vipUntil.setMonth(vipUntil.getMonth() + payment.vipMonths);
      userUpdate.$set = { vipUntil };
      userUpdate.$addToSet = { processedPaymentIds: payment._id, roles: "vip" };
    }

    await UserModel.updateOne(
      { _id: payment.userId, processedPaymentIds: { $ne: payment._id } },
      userUpdate,
    );

    await PaymentRequestModel.updateOne(
      { _id: payment._id, status: "pending" },
      {
        $set: {
          status: "approved",
          reviewedAt: new Date(),
          adminNote: `SePay tự động xác nhận (${payload.gateway || "Ngân hàng"}).`,
          sepayTransactionId: transactionId,
          sepayReferenceCode: payload.referenceCode || "",
          paidAt: parseSePayDate(payload.transactionDate),
        },
      },
    );

    return acknowledged("Đã tự động cộng quyền lợi.");
  } catch (error) {
    if (isDuplicateKeyError(error)) return acknowledged("Giao dịch đã được xử lý.");
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: "Dữ liệu webhook không hợp lệ." }, { status: 400 });
    }
    console.error("[SePay webhook]", error);
    return NextResponse.json({ success: false, message: "Không thể xử lý giao dịch." }, { status: 500 });
  }
}

function extractTransferCode(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const normalized = value?.toUpperCase().trim() || "";
    if (/^(?:AI|VIP)[A-Z0-9]{12}$/.test(normalized)) return normalized;
    const match = normalized.match(/(?:^|\s)((?:AI|VIP)[A-Z0-9]{12})(?=\s|$)/);
    if (match?.[1]) return match[1];
  }
  return "";
}

function safeEqual(value: string, expected: string) {
  const left = Buffer.from(value);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

function acknowledged(message: string) {
  return NextResponse.json({ success: true, message });
}

function parseSePayDate(value?: string) {
  if (!value) return new Date();
  const parsed = new Date(value.replace(" ", "T") + "+07:00");
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function isDuplicateKeyError(error: unknown): error is { code: number } {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: number }).code === 11000);
}
