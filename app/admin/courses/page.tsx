import { connectMongoDB } from "@/lib/mongodb";
import { DeckModel } from "@/models/Deck";
import { AdminCoursesClient } from "./AdminCoursesClient";
import { requireAdminPage } from "@/lib/admin/page-auth";
import { KANA_COURSES } from "@/app/flashcards/discover/KanaCourseCards";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const levels = ["kana", "n5", "n4", "n3", "n2", "n1", "it", "custom"];
const sourceTypes = ["system", "user", "ai"];
const visibilities = ["private", "public", "unlisted"];
const statuses = ["draft", "pending_review", "published", "rejected", "hidden", "archived"];

export default async function AdminCoursesPage({ searchParams }: Readonly<{ searchParams: SearchParams }>) {
  const session = await requireAdminPage("admin:course:read");
  const params = await searchParams;
  const page = clampNumber(firstParam(params.page), 1, 9999, 1);
  const limit = clampNumber(firstParam(params.limit), 5, 50, 10);
  const q = firstParam(params.q).trim();
  const level = firstParam(params.level);
  const sourceType = firstParam(params.sourceType);
  const visibility = firstParam(params.visibility);
  const status = firstParam(params.status);
  const initialOpenCourseId = firstParam(params.open);
  const initialCreatePreset = normalizeCreatePreset(firstParam(params.create));
  const category = normalizeCategory(firstParam(params.category));

  await connectMongoDB();

  const filter: Record<string, unknown> = {};

  if (q) {
    const safeQuery = escapeRegex(q);
    filter.$or = [
      { title: { $regex: safeQuery, $options: "i" } },
      { slug: { $regex: safeQuery, $options: "i" } },
      { description: { $regex: safeQuery, $options: "i" } },
      { tags: { $regex: safeQuery, $options: "i" } },
    ];
  }

  if (levels.includes(level)) filter.level = level;
  if (sourceTypes.includes(sourceType)) filter.sourceType = sourceType;
  if (visibilities.includes(visibility)) filter.visibility = visibility;
  if (statuses.includes(status)) filter.status = status;
  applyCategoryFilter(filter, category);

  const staticCourses = getStaticCourses({ category, level, q, sourceType, status, visibility });
  const skip = (page - 1) * limit;
  const staticPageCourses = staticCourses.slice(skip, skip + limit);
  const databaseSkip = Math.max(skip - staticCourses.length, 0);
  const databaseLimit = Math.max(limit - staticPageCourses.length, 0);
  const [databaseCourses, databaseTotal] = await Promise.all([
    databaseLimit > 0
      ? DeckModel.find(filter)
          .populate("ownerId", "username email displayName")
          .sort({ createdAt: -1 })
          .skip(databaseSkip)
          .limit(databaseLimit)
          .lean()
      : Promise.resolve([]),
    DeckModel.countDocuments(filter),
  ]);
  const courses = [...staticPageCourses, ...databaseCourses];
  const total = staticCourses.length + databaseTotal;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <AdminCoursesClient
      capabilities={{ create: session.permissions.includes("admin:course:create"), update: session.permissions.includes("admin:course:update"), delete: session.permissions.includes("admin:course:delete") }}
      courses={courses.map((course) => ({
        _id: String(course._id),
        title: course.title,
        slug: course.slug,
        description: course.description,
        level: course.level,
        sourceType: course.sourceType || "system",
        visibility: course.visibility,
        status: course.status,
        languagePair: {
          source: course.languagePair?.source,
          target: course.languagePair?.target,
        },
        price: {
          amount: course.price?.amount,
          currency: course.price?.currency,
        },
        stats: {
          vocabularyCount: course.stats?.vocabularyCount,
          learnerCount: course.stats?.learnerCount,
        },
        tags: course.tags || [],
        jlptTest: course.jlptTest ? {
          testId: course.jlptTest.testId ? String(course.jlptTest.testId) : undefined,
          level: course.jlptTest.level,
          number: course.jlptTest.number,
        } : undefined,
        ownerId: serializeOwner(course.ownerId),
        isStatic: "isStatic" in course ? course.isStatic : false,
      }))}
      meta={{ page: Math.min(page, totalPages), limit, total, totalPages }}
      initialOpenCourseId={initialOpenCourseId}
      initialCreatePreset={initialCreatePreset}
      listCategory={category}
    />
  );
}

function serializeOwner(owner: unknown) {
  if (!owner || typeof owner !== "object") {
    return owner ? String(owner) : undefined;
  }

  const ownerRecord = owner as Record<string, unknown>;

  return {
    _id: ownerRecord._id ? String(ownerRecord._id) : undefined,
    username: typeof ownerRecord.username === "string" ? ownerRecord.username : undefined,
    email: typeof ownerRecord.email === "string" ? ownerRecord.email : undefined,
    displayName: typeof ownerRecord.displayName === "string" ? ownerRecord.displayName : undefined,
  };
}

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return value || "";
}

function clampNumber(value: string, min: number, max: number, fallback: number) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.floor(numberValue)));
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeCreatePreset(value: string) {
  return ["course", "basic", "kanji", "flashcard", "roadmap"].includes(value) ? value : "";
}

function normalizeCategory(value: string) {
  return ["basic", "kanji", "flashcard", "roadmap", "test"].includes(value) ? value : "";
}

function applyCategoryFilter(filter: Record<string, unknown>, category: string) {
  if (category === "basic") filter.tags = "Cơ bản";
  if (category === "kanji") filter.tags = { $in: ["Kanji", "Luyện viết Kanji"] };
  if (category === "flashcard") filter.tags = { $nin: ["roadmap", "Test", "Cơ bản", "Kanji", "Luyện viết Kanji"] };
  if (category === "roadmap") filter.tags = "roadmap";
  if (category === "test") filter.tags = "Test";
}

function getStaticCourses({ category, level, q, sourceType, status, visibility }: { category: string; level: string; q: string; sourceType: string; status: string; visibility: string }) {
  if (category !== "basic") return [];
  if (level && level !== "kana") return [];
  if (sourceType && sourceType !== "system") return [];
  if (status && status !== "published") return [];
  if (visibility && visibility !== "public") return [];

  const normalizedQuery = q.toLowerCase();
  return KANA_COURSES
    .filter((course) => !normalizedQuery || [course.title, course.description, course.slug, ...course.tags].join(" ").toLowerCase().includes(normalizedQuery))
    .map((course) => ({
      _id: `kana-${course.slug}`,
      title: course.title,
      slug: course.slug,
      description: course.description,
      level: "kana" as const,
      sourceType: "system" as const,
      visibility: "public" as const,
      status: "published" as const,
      languagePair: { source: "ja", target: "vi" },
      price: { amount: 0, currency: "VND" },
      stats: { vocabularyCount: 46, learnerCount: 0 },
      tags: [...course.tags],
      ownerId: undefined,
      isStatic: true,
    }));
}
