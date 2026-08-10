import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { canAccessRoadmap } from "@/lib/roadmaps";
import { RoadmapCourseModel } from "@/models/RoadmapCourse";
import { RoadmapLessonModel } from "@/models/RoadmapLesson";
import { RoadmapProgressModel } from "@/models/RoadmapProgress";
const ProgressSchema = z.object({ lessonId: z.string(), completed: z.boolean().optional() });
export async function PATCH(request: NextRequest, context: RouteContext<"/api/roadmaps/[id]/progress">) { const session = await requireAuth(); const { id } = await context.params; await connectMongoDB(); const course = await RoadmapCourseModel.findById(id).lean(); const payload = ProgressSchema.parse(await request.json()); if (!course || !canAccessRoadmap(course, session.userId) || !await RoadmapLessonModel.exists({ _id: payload.lessonId, courseId: id })) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 }); const update: Record<string, unknown> = { $set: { lastLessonId: payload.lessonId, lastAccessedAt: new Date() } }; if (typeof payload.completed === "boolean") update[payload.completed ? "$addToSet" : "$pull"] = { completedLessonIds: payload.lessonId }; const progress = await RoadmapProgressModel.findOneAndUpdate({ userId: session.userId, courseId: id }, update, { upsert: true, new: true }).lean(); return NextResponse.json({ data: progress }); }
