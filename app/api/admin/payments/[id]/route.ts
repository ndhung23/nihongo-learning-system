import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requirePermission } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { PaymentRequestModel } from "@/models/PaymentRequest";
import { UserModel } from "@/models/User";

const ReviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
  note: z.string().trim().max(500).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requirePermission("admin:user:write");
    const { id } = await params;
    const payload = ReviewSchema.parse(await request.json());
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Mã yêu cầu không hợp lệ." }, { status: 400 });
    }

    await connectMongoDB();
    const payment = await PaymentRequestModel.findById(id).lean();
    if (!payment) return NextResponse.json({ message: "Không tìm thấy yêu cầu." }, { status: 404 });
    if (payment.status !== "pending") {
      return NextResponse.json({ message: "Yêu cầu này đã được xử lý." }, { status: 409 });
    }

    if (payload.action === "reject") {
      await PaymentRequestModel.updateOne(
        { _id: payment._id, status: "pending" },
        { $set: { status: "rejected", reviewedBy: admin.userId, reviewedAt: new Date(), adminNote: payload.note } },
      );
      return NextResponse.json({ ok: true, status: "rejected" });
    }

    const user = await UserModel.findById(payment.userId).select("vipUntil").lean();
    if (!user) return NextResponse.json({ message: "Không tìm thấy người dùng." }, { status: 404 });

    const update: Record<string, unknown> = {
      $inc: { aiCredits: payment.aiCredits },
      $addToSet: { processedPaymentIds: payment._id },
    };
    if (payment.kind === "vip") {
      const base = user.vipUntil && new Date(user.vipUntil) > new Date() ? new Date(user.vipUntil) : new Date();
      base.setMonth(base.getMonth() + payment.vipMonths);
      update.$set = { vipUntil: base };
      update.$addToSet = { processedPaymentIds: payment._id, roles: "vip" };
    }

    await UserModel.updateOne(
      { _id: payment.userId, processedPaymentIds: { $ne: payment._id } },
      update,
    );
    await PaymentRequestModel.updateOne(
      { _id: payment._id, status: "pending" },
      { $set: { status: "approved", reviewedBy: admin.userId, reviewedAt: new Date(), adminNote: payload.note } },
    );

    return NextResponse.json({ ok: true, status: "approved" });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.code === "UNAUTHORIZED" ? 401 : 403 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Dữ liệu duyệt không hợp lệ." }, { status: 400 });
    }
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Không thể duyệt yêu cầu." },
      { status: 500 },
    );
  }
}
