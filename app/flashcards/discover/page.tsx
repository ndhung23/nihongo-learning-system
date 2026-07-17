import Link from "next/link";
import { FiBookOpen, FiFilter, FiSearch, FiUsers } from "react-icons/fi";
import { connectMongoDB } from "@/lib/mongodb";
import { DeckModel } from "@/models/Deck";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DiscoverPage({ searchParams }: Readonly<{ searchParams: SearchParams }>) {
  const params = await searchParams;
  const type = firstParam(params.type) || "flashcard";
  const q = firstParam(params.q).trim();

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
    .sort({ "stats.learnerCount": -1, "stats.vocabularyCount": -1, updatedAt: -1 })
    .limit(80)
    .lean();

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-rose-600">Khám phá</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Các khóa học</h1>
          <p className="mt-3 max-w-2xl text-slate-500">Sắp xếp từ khóa học nhiều người đăng ký nhất đến ít người đăng ký nhất.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DiscoverFilter href={`/flashcards/discover?type=flashcard${q ? `&q=${encodeURIComponent(q)}` : ""}`} active={type !== "roadmap"} label="Khóa học flashcard" />
          <DiscoverFilter href={`/flashcards/discover?type=roadmap${q ? `&q=${encodeURIComponent(q)}` : ""}`} active={type === "roadmap"} label="Khóa học lộ trình" />
        </div>
      </div>

      <form className="mt-6 flex flex-col gap-3 rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-xl shadow-slate-900/[0.04] sm:flex-row" action="/flashcards/discover">
        <input name="type" type="hidden" value={type === "roadmap" ? "roadmap" : "flashcard"} />
        <label className="flex h-12 flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-teal-300 focus-within:bg-white">
          <FiSearch className="text-slate-400" />
          <input
            className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-slate-400"
            defaultValue={q}
            name="q"
            placeholder="Tìm theo tên khóa học, mô tả, tag..."
          />
        </label>
        <button className="h-12 rounded-2xl bg-slate-950 px-6 font-black text-white transition hover:-translate-y-0.5 hover:bg-teal-700" type="submit">
          Tìm khóa học
        </button>
        {q ? (
          <Link className="flex h-12 items-center justify-center rounded-2xl border border-slate-200 px-5 font-black text-slate-600 transition hover:border-rose-200 hover:text-rose-600" href={`/flashcards/discover?type=${type === "roadmap" ? "roadmap" : "flashcard"}`}>
            Xóa lọc
          </Link>
        ) : null}
      </form>

      <section className="mt-8 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => (
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
              <div className="rounded-2xl bg-slate-50 p-3 text-slate-700">{course.stats?.vocabularyCount || 0} từ</div>
            </div>
            <Link className="mt-5 flex h-11 items-center justify-center rounded-2xl bg-slate-950 font-black text-white transition hover:-translate-y-0.5 hover:bg-rose-600" href={`/flashcards/study?mode=flashcard&deckId=${String(course._id)}`}>
              Học khóa này
            </Link>
          </article>
        ))}
      </section>

      {courses.length === 0 && (
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

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
