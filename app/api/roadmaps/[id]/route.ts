import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { canAccessRoadmap, requireRoadmapOwner } from "@/lib/roadmaps";
import { RoadmapCourseModel } from "@/models/RoadmapCourse";
import { RoadmapLessonModel } from "@/models/RoadmapLesson";
import { RoadmapProgressModel } from "@/models/RoadmapProgress";
const UpdateSchema = z.object({ title: z.string().trim().min(2).max(120), description: z.string().trim().max(1000), visibility: z.enum(["private", "unlisted", "public"]) });
export async function GET(_request: NextRequest, context: RouteContext<"/api/roadmaps/[id]">) { const session = await requireAuth(); const { id } = await context.params; if (!Types.ObjectId.isValid(id)) return NextResponse.json({ message: "Khóa học không hợp lệ." }, { status: 400 }); await connectMongoDB(); const course = await RoadmapCourseModel.findById(id).populate("ownerId", "displayName username").lean(); if (!course || !canAccessRoadmap(course, session.userId)) return NextResponse.json({ message: "Bạn không có quyền xem khóa học này." }, { status: 403 }); const ownerId = String((course.ownerId as { _id?: unknown })?._id || course.ownerId); const [lessons, progress] = await Promise.all([RoadmapLessonModel.find({ courseId: id }).sort({ order: 1 }).lean(), RoadmapProgressModel.findOne({ courseId: id, userId: session.userId }).lean()]); return NextResponse.json({ data: { course: { ...course, _id: id, isOwner: ownerId === session.userId }, lessons: lessons.map((l) => ({ ...l, _id: String(l._id) })), progress: progress || { completedLessonIds: [] } } }); }
export async function PATCH(request: NextRequest, context: RouteContext<"/api/roadmaps/[id]">) { const session = await requireAuth(); const { id } = await context.params; await connectMongoDB(); const course = await requireRoadmapOwner(id, session.userId); if (!course) return NextResponse.json({ message: "Bạn không có quyền chỉnh sửa." }, { status: 403 }); Object.assign(course, UpdateSchema.parse(await request.json())); await course.save(); return NextResponse.json({ data: course }); }
