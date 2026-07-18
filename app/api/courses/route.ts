import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { connectMongoDB } from "@/lib/mongodb";
import { DeckModel } from "@/models/Deck";

const getCachedCourses = unstable_cache(
  async (sort: string, type: string, q: string, limit: number) => {
    await connectMongoDB();

    const filter: Record<string, unknown> = {
      status: "published",
      visibility: "public",
    };

    if (type === "roadmap") {
      filter.tags = "roadmap";
    }

    if (q) {
      const pattern = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ title: pattern }, { description: pattern }, { tags: pattern }, { slug: pattern }];
    }

    const courses = await DeckModel.find(filter)
      .sort(sort === "newest" ? { updatedAt: -1 } : { "stats.learnerCount": -1, "stats.vocabularyCount": -1, updatedAt: -1 })
      .limit(limit)
      .lean();

    return courses.map((course) => ({
      id: course._id.toString(),
      title: course.title,
      slug: course.slug,
      description: course.description,
      level: course.level,
      type: course.tags?.includes("roadmap") ? "roadmap" : "flashcard",
      stats: course.stats,
      tags: course.tags,
    }));
  },
  ["public-courses"],
  { revalidate: 300, tags: ["courses"] },
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sort = searchParams.get("sort") || "learners";
  const type = searchParams.get("type") || "all";
  const q = searchParams.get("q")?.trim() || "";
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || 24), 1), 80);
  const courses = await getCachedCourses(sort, type, q, limit);

  return NextResponse.json(
    { data: courses },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
  );
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
