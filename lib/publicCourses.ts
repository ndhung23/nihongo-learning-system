import "server-only";

import { unstable_cache } from "next/cache";
import { connectMongoDB } from "@/lib/mongodb";
import { DeckModel } from "@/models/Deck";

export type PublicCourse = {
  id: string;
  title: string;
  slug: string;
  description: string;
  level: string;
  type: string;
  jlptTest?: { level?: string; number?: number };
  stats?: {
    vocabularyCount?: number;
    learnerCount?: number;
    ratingAverage?: number;
    ratingCount?: number;
  };
  tags?: string[];
};

export const getCachedPublicCourses = unstable_cache(
  async (sort: string, type: string, q: string, limit: number): Promise<PublicCourse[]> => {
    await connectMongoDB();
    const filter: Record<string, unknown> = { status: "published", visibility: "public" };

    if (type === "roadmap") filter.tags = "roadmap";
    else if (type === "test") filter.tags = "Test";
    else if (type === "kanji") filter.tags = { $in: ["Kanji", "Luyện viết Kanji"] };
    else if (type === "basic") filter.tags = "Cơ bản";
    else if (type === "flashcard") filter.tags = { $nin: ["roadmap", "Test", "Cơ bản", "Kanji", "Luyện viết Kanji"] };

    if (q) {
      const pattern = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ title: pattern }, { description: pattern }, { tags: pattern }, { slug: pattern }];
    }

    const courses = await DeckModel.find(filter)
      .sort(sort === "newest" ? { updatedAt: -1 } : { "stats.learnerCount": -1, "stats.vocabularyCount": -1, updatedAt: -1 })
      .select("title slug description level contentType jlptTest stats tags")
      .limit(limit)
      .lean();

    return courses.map((course) => ({
      id: course._id.toString(),
      title: course.title,
      slug: course.slug,
      description: course.description,
      level: course.level,
      type:
        course.contentType === "jlpt-test"
          ? "jlpt-test"
          : course.tags?.includes("roadmap")
            ? "roadmap"
            : course.tags?.includes("Kanji") || course.tags?.includes("Luyện viết Kanji")
              ? "kanji"
              : course.tags?.includes("Cơ bản")
                ? "basic"
                : "flashcard",
      jlptTest: course.jlptTest ? { level: course.jlptTest.level, number: course.jlptTest.number } : undefined,
      stats: course.stats,
      tags: course.tags,
    }));
  },
  ["public-courses-v3"],
  { revalidate: 600, tags: ["courses"] },
);
