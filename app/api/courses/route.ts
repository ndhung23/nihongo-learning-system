import { NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { DeckModel } from "@/models/Deck";

export async function GET() {
  await connectMongoDB();

  const courses = await DeckModel.find({
    status: "published",
    visibility: "public",
  })
    .sort({ updatedAt: -1 })
    .limit(24)
    .lean();

  return NextResponse.json({
    data: courses.map((course) => ({
      id: course._id.toString(),
      title: course.title,
      slug: course.slug,
      description: course.description,
      level: course.level,
      stats: course.stats,
      tags: course.tags,
    })),
  });
}
