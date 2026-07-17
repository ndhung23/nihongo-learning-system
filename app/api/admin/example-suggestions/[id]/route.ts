import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, AuthError } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { ExampleSuggestionModel } from "@/models/ExampleSuggestion";
import { VocabularyModel } from "@/models/Vocabulary";

const ReviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await requirePermission("admin:course:write");
    await connectMongoDB();

    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "ID góp ý không hợp lệ." }, { status: 400 });
    }

    const payload = ReviewSchema.parse(await request.json());
    const suggestion = await ExampleSuggestionModel.findById(id).lean();

    if (!suggestion) {
      return NextResponse.json({ message: "Không tìm thấy góp ý mẫu câu." }, { status: 404 });
    }

    if (payload.action === "approve") {
      await VocabularyModel.findByIdAndUpdate(suggestion.vocabularyId, {
        $addToSet: {
          examples: {
            ja: suggestion.suggestedJa,
            vi: suggestion.suggestedVi || "",
          },
        },
      });
    }

    const updated = await ExampleSuggestionModel.findByIdAndUpdate(
      id,
      {
        $set: {
          status: payload.action === "approve" ? "approved" : "rejected",
          reviewedBy: session.userId,
          reviewedAt: new Date(),
        },
      },
      { new: true },
    ).lean();

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { message: error.message, code: error.code },
        { status: error.code === "UNAUTHORIZED" ? 401 : 403 },
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Thao tác không hợp lệ.", issues: error.issues }, { status: 400 });
    }

    return NextResponse.json({ message: error instanceof Error ? error.message : "Không thể duyệt góp ý." }, { status: 500 });
  }
}
