import Link from "next/link";
import { FiArrowRight, FiBookOpen, FiCheckCircle, FiUsers } from "react-icons/fi";

const KANA_COURSES = [
  {
    slug: "hiragana", title: "Hiragana cho người mới", character: "あ",
    description: "Làm quen 46 chữ Hiragana cơ bản bằng bài luyện nhận diện và nhập romaji có chấm đáp án ngay.",
    tags: ["Cơ bản", "Hiragana", "Kana"], accent: "from-rose-500 to-orange-400",
  },
  {
    slug: "katakana", title: "Katakana cho người mới", character: "ア",
    description: "Ghi nhớ 46 chữ Katakana thường dùng cho từ mượn qua bài luyện ngắn, dễ bắt đầu và lặp lại.",
    tags: ["Cơ bản", "Katakana", "Kana"], accent: "from-teal-500 to-cyan-400",
  },
] as const;

type Props = { level: string; query: string; type: string };

export function getVisibleKanaCourseCount(props: Props) {
  return getVisibleCourses(props).length;
}

export function KanaCourseCards(props: Readonly<Props>) {
  const courses = getVisibleCourses(props);
  if (!courses.length) return null;

  return (
    <section className="mt-8 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
      {courses.map((course) => (
        <article className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/[0.05] transition hover:-translate-y-1 hover:border-teal-300 hover:shadow-2xl hover:shadow-teal-500/10" key={course.slug}>
          <div className={`flex items-center justify-between bg-gradient-to-br ${course.accent} p-5 text-white`}>
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-white/20 text-4xl font-black backdrop-blur" lang="ja">{course.character}</span>
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-black uppercase backdrop-blur">Nhập môn</span>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-teal-700"><FiBookOpen /> Khóa luyện Kana</div>
            <h2 className="mt-3 text-xl font-black text-slate-950">{course.title}</h2>
            <p className="mt-3 min-h-12 text-sm leading-6 text-slate-500">{course.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {course.tags.map((tag) => <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600" key={tag}>{tag}</span>)}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm font-black">
              <div className="rounded-2xl bg-slate-50 p-3 text-slate-700"><FiUsers className="mr-2 inline" /> Người mới</div>
              <div className="rounded-2xl bg-slate-50 p-3 text-slate-700"><FiCheckCircle className="mr-2 inline" /> 46 chữ</div>
            </div>
            <Link className="mt-5 flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 font-black text-white transition group-hover:bg-rose-600" href={`/flashcards/kana/${course.slug}`}>
              Bắt đầu luyện <FiArrowRight />
            </Link>
          </div>
        </article>
      ))}
    </section>
  );
}

function getVisibleCourses({ level, query, type }: Props) {
  if (!["all", "basic"].includes(type) || level) return [];
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return KANA_COURSES;
  return KANA_COURSES.filter((course) =>
    [course.title, course.description, course.slug, ...course.tags].join(" ").toLowerCase().includes(normalizedQuery),
  );
}
