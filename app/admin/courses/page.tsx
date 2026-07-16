import { connectMongoDB } from "@/lib/mongodb";
import { DeckModel } from "@/models/Deck";
import { AdminCoursesClient } from "./AdminCoursesClient";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const levels = ["kana", "n5", "n4", "n3", "n2", "n1", "it", "custom"];
const sourceTypes = ["system", "user", "ai"];
const visibilities = ["private", "public", "unlisted"];
const statuses = ["draft", "pending_review", "published", "rejected", "hidden", "archived"];

export default async function AdminCoursesPage({ searchParams }: Readonly<{ searchParams: SearchParams }>) {
  const params = await searchParams;
  const page = clampNumber(firstParam(params.page), 1, 9999, 1);
  const limit = clampNumber(firstParam(params.limit), 5, 50, 10);
  const q = firstParam(params.q).trim();
  const level = firstParam(params.level);
  const sourceType = firstParam(params.sourceType);
  const visibility = firstParam(params.visibility);
  const status = firstParam(params.status);

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

  const skip = (page - 1) * limit;
  const [courses, total] = await Promise.all([
    DeckModel.find(filter)
      .populate("ownerId", "username email displayName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    DeckModel.countDocuments(filter),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <AdminCoursesClient
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
        ownerId: serializeOwner(course.ownerId),
      }))}
      meta={{ page: Math.min(page, totalPages), limit, total, totalPages }}
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
