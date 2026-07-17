import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { FeedbackModel } from "@/models/Feedback";

const FeedbackSchema = z.object({
  message: z.string().trim().min(5).max(2000),
  page: z.string().trim().max(300).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const payload = FeedbackSchema.parse(await request.json());
    const session = await getAuthSession();

    await connectMongoDB();

    const feedback = await FeedbackModel.create({
      userId: session?.userId,
      name: session?.username,
      email: session?.email,
      message: payload.message,
      page: payload.page,
    });

    return NextResponse.json({ data: { id: feedback._id.toString() } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Nội dung góp ý cần từ 5 đến 2000 ký tự.", issues: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Không thể gửi góp ý lúc này." },
      { status: 500 },
    );
  }
}
