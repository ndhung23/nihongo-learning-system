import { NextResponse } from "next/server";
import { AuthError, requirePermission } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { PaymentRequestModel } from "@/models/PaymentRequest";

export async function GET() {
  try {
    await requirePermission("admin:user:write");
    await connectMongoDB();
    const payments = await PaymentRequestModel.find()
      .populate("userId", "username email displayName")
      .sort({ status: 1, createdAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({
      data: payments.map((payment) => ({
        id: String(payment._id),
        user: payment.userId,
        kind: payment.kind,
        amount: payment.amount,
        aiCredits: payment.aiCredits,
        vipMonths: payment.vipMonths,
        transferCode: payment.transferCode,
        status: payment.status,
        adminNote: payment.adminNote,
        createdAt: payment.createdAt,
        reviewedAt: payment.reviewedAt,
      })),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.code === "UNAUTHORIZED" ? 401 : 403 });
    }
    return NextResponse.json({ message: "Không thể tải yêu cầu thanh toán." }, { status: 500 });
  }
}
