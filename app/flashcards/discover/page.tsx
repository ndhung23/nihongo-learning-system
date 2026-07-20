import Link from "next/link";
import { FiBookOpen, FiChevronLeft, FiChevronRight, FiFilter, FiUsers } from "react-icons/fi";
import { connectMongoDB } from "@/lib/mongodb";
import { DeckModel } from "@/models/Deck";
import { DiscoverControls } from "./DiscoverControls";
import { CourseStudyButton } from "./CourseStudyButton";
import { getVisibleKanaCourseCount, KanaCourseCards } from "./KanaCourseCards";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DiscoverPage({ searchParams }: Readonly<{ searchParams: SearchParams }>) {
  const params = await searchParams;
  const type = firstParam(params.type) || "all";
  const q = firstParam(params.q).trim();
  const level = normalizeLevel(firstParam(params.level));
  const sort = normalizeSort(firstParam(params.sort));
  const requestedPage = Math.max(Number(firstParam(params.page)) || 1, 1);
  const pageSize = 9;

  await connectMongoDB();

  const filter: Record<string, unknown> = {
    status: "published",
    visibility: "public",
  };

  if (type === "roadmap") {
    filter.tags = "roadmap";
  } else if (type === "test") {
    filter.tags = "Test";
  } else if (type === "kanji") {
    filter.tags = { $in: ["Kanji", "Luyện viết Kanji"] };
  } else if (type === "basic") {
    filter.tags = "Cơ bản";
  } else if (type === "flashcard") {
    filter.tags = { $nin: ["roadmap", "Test", "Cơ bản", "Kanji", "Luyện viết Kanji"] };
  }

  if (q) {
    const pattern = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ title: pattern }, { description: pattern }, { tags: pattern }, { slug: pattern }];
  }

  if (level) {
    filter.level = level;
  }

  const sortDefinition: Record<string, 1 | -1> =
    sort === "learners"
      ? { "stats.learnerCount": -1, updatedAt: -1 }
      : sort === "oldest"
        ? { updatedAt: 1 }
        : { updatedAt: -1 };

  const kanaCourseCount = getVisibleKanaCourseCount({ level, query: q, type });
  const [totalCourses, requestedCourses] = await Promise.all([
    DeckModel.countDocuments(filter),
    DeckModel.find(filter)
      .sort(sortDefinition)
      .skip((requestedPage - 1) * pageSize)
      .limit(pageSize)
      .select("title slug description level contentType jlptTest stats tags")
      .lean(),
  ]);
  const totalPages = Math.max(Math.ceil(totalCourses / pageSize), 1);
  const page = Math.min(requestedPage, totalPages);
  const courses =
    page === requestedPage
      ? requestedCourses
      : await DeckModel.find(filter)
          .sort(sortDefinition)
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .select("title slug description level contentType jlptTest stats tags")
          .lean();

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-rose-600">Khám phá</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Các khóa học</h1>
          <p className="mt-3 max-w-2xl text-slate-500">
            {totalCourses + kanaCourseCount} khóa học phù hợp · Mặc định hiển thị khóa mới nhất trước.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DiscoverFilter href={buildDiscoverHref({ type: "all", q, level, sort })} active={type === "all"} label="All" />
          <DiscoverFilter href={buildDiscoverHref({ type: "basic", q, level, sort })} active={type === "basic"} label="Khóa học cơ bản" />
          <DiscoverFilter href={buildDiscoverHref({ type: "kanji", q, level, sort })} active={type === "kanji"} label="Luyện viết Kanji" />
          <DiscoverFilter href={buildDiscoverHref({ type: "flashcard", q, level, sort })} active={type === "flashcard"} label="Khóa học flashcard" />
          <DiscoverFilter href={buildDiscoverHref({ type: "roadmap", q, level, sort })} active={type === "roadmap"} label="Khóa học lộ trình" />
          <DiscoverFilter href={buildDiscoverHref({ type: "test", q, level, sort })} active={type === "test"} label="Đề thi" />
        </div>
      </div>

      <DiscoverControls
        initialLevel={level}
        initialQuery={q}
        initialSort={sort}
        type={["basic", "kanji", "flashcard", "roadmap", "test"].includes(type) ? type : "all"}
      />

      <KanaCourseCards level={level} query={q} type={type} />

      <section className="mt-8 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => {
          const isJlptTest =
            course.contentType === "jlpt-test" &&
            course.jlptTest?.level &&
            course.jlptTest.number;
          const courseHref = isJlptTest
            ? `/flashcards/tests/${course.jlptTest.level.toLowerCase()}/${course.jlptTest.number}`
            : course.slug === "n5-test-ngu-phap-tu-vung-doc-hieu"
              ? "/flashcards/tests"
              : `/flashcards/study?mode=flashcard&deckId=${String(course._id)}`;

          return (
          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/[0.05] transition hover:-translate-y-1 hover:border-teal-300 hover:shadow-2xl hover:shadow-teal-500/10" key={String(course._id)}>
            <div className="flex items-start justify-between gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-50 text-xl text-teal-700">
                <FiBookOpen />
              </span>
              <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black uppercase text-rose-700">{course.level}</span>
            </div>
            <h2 className="mt-5 text-xl font-black text-slate-950">{course.title}</h2>
            <p className="mt-3 line-clamp-2 min-h-12 text-sm leading-6 text-slate-500">{course.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {((course.tags || []) as string[]).slice(0, 4).map((tag) => (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600" key={tag}>{tag}</span>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm font-black">
              <div className="rounded-2xl bg-slate-50 p-3 text-slate-700">
                <FiUsers className="mr-2 inline" /> {course.stats?.learnerCount || 0} học viên
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 text-slate-700">
                {course.stats?.vocabularyCount || 0} {isJlptTest ? "câu" : "từ"}
              </div>
            </div>
            {isJlptTest || course.slug === "n5-test-ngu-phap-tu-vung-doc-hieu" ? (
              <Link
                className="mt-5 flex h-11 items-center justify-center rounded-2xl bg-slate-950 font-black text-white transition hover:-translate-y-0.5 hover:bg-rose-600"
                href={courseHref}
              >
                Làm bài
              </Link>
            ) : (
              <CourseStudyButton
                courseId={String(course._id)}
                level={course.level || ""}
                slug={course.slug || ""}
                tags={(course.tags || []) as string[]}
                title={course.title}
                vocabularyCount={course.stats?.vocabularyCount || 0}
              />
            )}
          </article>
          );
        })}
      </section>

      {totalPages > 1 && (
        <nav
          aria-label="Phân trang khóa học"
          className="mt-8 flex flex-wrap items-center justify-center gap-2"
        >
          <PaginationLink
            disabled={page === 1}
            href={buildDiscoverHref({ type, q, level, sort, page: page - 1 })}
            label={<><FiChevronLeft /> Trước</>}
          />
          {paginationItems(page, totalPages).map((item, index) =>
            item === "ellipsis" ? (
              <span className="grid h-10 w-10 place-items-center text-sm font-black text-slate-400" key={`ellipsis-${index}`}>
                …
              </span>
            ) : (
              <Link
                aria-current={item === page ? "page" : undefined}
                className={`grid h-10 min-w-10 place-items-center rounded-xl px-3 text-sm font-black transition ${
                  item === page
                    ? "bg-slate-950 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:text-teal-700"
                }`}
                href={buildDiscoverHref({ type, q, level, sort, page: item })}
                key={item}
              >
                {item}
              </Link>
            ),
          )}
          <PaginationLink
            disabled={page === totalPages}
            href={buildDiscoverHref({ type, q, level, sort, page: page + 1 })}
            label={<>Sau <FiChevronRight /></>}
          />
        </nav>
      )}

      {courses.length === 0 && kanaCourseCount === 0 && (
        <div className="mt-8 rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-8 text-center">
          <FiFilter className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 font-black text-slate-950">Chưa có khóa học phù hợp.</p>
          <p className="mt-2 text-sm text-slate-500">{q ? `Không tìm thấy khóa học có từ khóa "${q}".` : "Hiện tại hệ thống chủ yếu có khóa học flashcard, khóa học lộ trình sẽ thêm sau."}</p>
        </div>
      )}
    </div>
  );
}

function DiscoverFilter({ active, href, label }: Readonly<{ active: boolean; href: string; label: string }>) {
  return (
    <Link className={`rounded-full border px-4 py-2 text-sm font-black transition ${active ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:text-teal-700"}`} href={href}>
      {label}
    </Link>
  );
}

function PaginationLink({
  disabled,
  href,
  label,
}: Readonly<{
  disabled: boolean;
  href: string;
  label: React.ReactNode;
}>) {
  if (disabled) {
    return (
      <span className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 px-4 text-sm font-black text-slate-400">
        {label}
      </span>
    );
  }

  return (
    <Link
      className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
      href={href}
    >
      {label}
    </Link>
  );
}

function buildDiscoverHref({
  level,
  page,
  q,
  sort,
  type,
}: {
  level?: string;
  page?: number;
  q?: string;
  sort?: string;
  type: string;
}) {
  const params = new URLSearchParams({ type });
  if (q) params.set("q", q);
  if (level) params.set("level", level);
  if (sort && sort !== "newest") params.set("sort", sort);
  if (page && page > 1) params.set("page", String(page));
  return `/flashcards/discover?${params.toString()}`;
}

function paginationItems(page: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: Array<number | "ellipsis"> = [1];
  if (page > 3) items.push("ellipsis");
  for (
    let item = Math.max(2, page - 1);
    item <= Math.min(totalPages - 1, page + 1);
    item += 1
  ) {
    items.push(item);
  }
  if (page < totalPages - 2) items.push("ellipsis");
  items.push(totalPages);
  return items;
}

function normalizeLevel(value: string) {
  return ["n5", "n4", "n3", "n2", "n1"].includes(value.toLowerCase())
    ? value.toLowerCase()
    : "";
}

function normalizeSort(value: string) {
  return ["newest", "learners", "oldest"].includes(value)
    ? value
    : "newest";
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
