import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { requireRoadmapOwner, validRichText, youtubeVideoId } from "@/lib/roadmaps";
import { RoadmapLessonModel } from "@/models/RoadmapLesson";
const LessonSchema = z.object({ title: z.string().trim().min(1).max(160), youtubeUrl: z.string().trim().max(300).default(""), creatorNote: z.unknown() });
export async function PATCH(request: NextRequest, context: RouteContext<"/api/roadmaps/[id]/lessons/[lessonId]">) { const session = await requireAuth(); const { id, lessonId } = await context.params; await connectMongoDB(); if (!await requireRoadmapOwner(id, session.userId)) return NextResponse.json({ message: "Bạn không có quyền sửa bài." }, { status: 403 }); const payload = LessonSchema.parse(await request.json()); if (payload.youtubeUrl && !youtubeVideoId(payload.youtubeUrl)) return NextResponse.json({ message: "Link YouTube không hợp lệ." }, { status: 400 }); if (!validRichText(payload.creatorNote)) return NextResponse.json({ message: "Note bài không hợp lệ hoặc quá lớn." }, { status: 400 }); const lesson = await RoadmapLessonModel.findOneAndUpdate({ _id: lessonId, courseId: id }, { $set: payload }, { new: true }).lean(); if (!lesson) return NextResponse.json({ message: "Không tìm thấy bài học." }, { status: 404 }); return NextResponse.json({ data: lesson }); }
