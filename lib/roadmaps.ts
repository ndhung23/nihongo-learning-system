import { Types } from "mongoose";
import { RoadmapCourseModel } from "@/models/RoadmapCourse";

export function canAccessRoadmap(course: { ownerId: unknown; visibility: string }, userId?: string) {
  return Boolean(userId && String(course.ownerId) === userId) || course.visibility === "public" || course.visibility === "unlisted";
}

export async function requireRoadmapOwner(courseId: string, userId: string) {
  if (!Types.ObjectId.isValid(courseId)) return null;
  return RoadmapCourseModel.findOne({ _id: courseId, ownerId: userId });
}

export function youtubeVideoId(url: string) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "youtu.be") return /^[\w-]{11}$/.test(parsed.pathname.slice(1)) ? parsed.pathname.slice(1) : "";
    if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(parsed.hostname)) {
      const id = parsed.searchParams.get("v") || (parsed.pathname.startsWith("/embed/") ? parsed.pathname.split("/")[2] : "");
      return id && /^[\w-]{11}$/.test(id) ? id : "";
    }
  } catch { return ""; }
  return "";
}

export function validRichText(content: unknown) {
  return Boolean(content && typeof content === "object" && JSON.stringify(content).length <= 100_000);
}
