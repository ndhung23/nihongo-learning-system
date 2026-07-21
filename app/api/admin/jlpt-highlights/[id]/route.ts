import { isValidObjectId } from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requirePermission } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { JlptHighlightSuggestionModel } from "@/models/JlptHighlightSuggestion";
import { JlptTestModel } from "@/models/JlptTest";

const BodySchema = z.object({ action: z.enum(["approve", "reject"]) });

export async function PATCH(request: Request, context: RouteContext<"/api/admin/jlpt-highlights/[id]">) {
  try {
    const session = await requirePermission("admin:course:write");
    const { id } = await context.params;
    const { action } = BodySchema.parse(await request.json());
    if (!isValidObjectId(id)) return NextResponse.json({ message: "Mã góp ý không hợp lệ." }, { status: 400 });
    await connectMongoDB();

    const suggestion = await JlptHighlightSuggestionModel.findOne({ _id: id, status: "pending" });
    if (!suggestion) return NextResponse.json({ message: "Góp ý đã được xử lý hoặc không tồn tại." }, { status: 404 });

    if (action === "approve") {
      const result = await JlptTestModel.updateOne(
        { level: suggestion.level, number: suggestion.testNumber },
        { $set: { [`sections.${suggestion.section}.$[question].highlightText`]: suggestion.suggestedHighlightText } },
        { arrayFilters: [{ "question.id": suggestion.questionId }] },
      );
      if (!result.modifiedCount) return NextResponse.json({ message: "Không tìm thấy câu hỏi để áp dụng." }, { status: 404 });
    }

    suggestion.status = action === "approve" ? "approved" : "rejected";
    suggestion.reviewedBy = session.userId;
    suggestion.reviewedAt = new Date();
    await suggestion.save();
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ message: error.message }, { status: error.code === "UNAUTHORIZED" ? 401 : 403 });
    if (error instanceof z.ZodError) return NextResponse.json({ message: "Thao tác không hợp lệ." }, { status: 400 });
    return NextResponse.json({ message: "Không thể xử lý góp ý." }, { status: 500 });
  }
}
