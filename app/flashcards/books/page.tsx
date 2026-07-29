import {
  FiBookOpen,
  FiCheck,
  FiExternalLink,
  FiFeather,
  FiShield,
} from "react-icons/fi";

const books = [
  {
    title: "Minna no Nihongo",
    description: "Giáo trình nền tảng, phù hợp cho người mới bắt đầu học tiếng Nhật.",
    level: "N5–N4",
    accent: "from-rose-500 to-orange-400",
    href: process.env.NEXT_PUBLIC_AFFILIATE_MINNA_URL,
  },
  {
    title: "Sou Matome",
    description: "Bộ sách ôn tập theo từng kỹ năng, chia bài ngắn và dễ theo dõi mỗi ngày.",
    level: "N3–N1",
    accent: "from-teal-500 to-cyan-400",
    href: process.env.NEXT_PUBLIC_AFFILIATE_SOUMATOME_URL,
  },
  {
    title: "Shin Kanzen Master",
    description: "Luyện chuyên sâu ngữ pháp, từ vựng, đọc hiểu và nghe hiểu cho kỳ thi JLPT.",
    level: "N3–N1",
    accent: "from-violet-600 to-fuchsia-500",
    href: process.env.NEXT_PUBLIC_AFFILIATE_SHINKANZEN_URL,
  },
] as const;

export default function BookStorePage() {
  return (
    <div className="mx-auto min-h-[calc(100vh-4rem)] max-w-[1500px] px-4 py-10 sm:px-6 lg:px-10">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/5 dark:border-slate-700 dark:bg-slate-900">
        <div className="grid gap-8 bg-gradient-to-br from-amber-50 via-white to-teal-50 p-7 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center dark:from-amber-400/10 dark:via-slate-900 dark:to-teal-400/10">
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-amber-700 dark:text-amber-400">
              <FiFeather aria-hidden="true" /> Góc sách Nihongo
            </p>
            <h1 className="mt-3 max-w-3xl text-3xl font-black leading-tight text-slate-950 sm:text-5xl dark:text-white">
              Chọn đúng sách, học tiếng Nhật dễ hơn
            </h1>
            <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-slate-600 dark:text-slate-300">
              Những bộ giáo trình phổ biến được chọn lọc theo mục tiêu và trình độ học.
            </p>
          </div>
          <div className="grid h-28 w-28 place-items-center rounded-[2rem] bg-gradient-to-br from-amber-400 to-orange-500 text-5xl text-white shadow-2xl shadow-amber-500/25">
            <FiBookOpen aria-hidden="true" />
          </div>
        </div>
      </section>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {books.map((book) => (
          <article
            className="group flex min-h-72 flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-900/5 transition duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-slate-700 dark:bg-slate-900"
            key={book.title}
          >
            <div className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${book.accent} text-2xl text-white shadow-lg`}>
              <FiBookOpen aria-hidden="true" />
            </div>
            <span className="mt-5 w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {book.level}
            </span>
            <h2 className="mt-3 text-xl font-black text-slate-950 dark:text-white">{book.title}</h2>
            <p className="mt-2 flex-1 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
              {book.description}
            </p>
            {book.href ? (
              <a
                className="mt-6 flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 text-sm font-black text-white transition hover:bg-rose-600 dark:bg-teal-400 dark:text-slate-950 dark:hover:bg-teal-300"
                href={book.href}
                rel="nofollow sponsored noopener noreferrer"
                target="_blank"
              >
                Xem nơi bán <FiExternalLink aria-hidden="true" />
              </a>
            ) : (
              <span className="mt-6 flex h-11 items-center justify-center rounded-xl bg-slate-100 text-sm font-black text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                Sắp cập nhật link mua
              </span>
            )}
          </article>
        ))}
      </div>

      <aside className="mt-8 flex flex-col gap-4 rounded-3xl border border-teal-200 bg-teal-50 p-5 sm:flex-row sm:items-center dark:border-teal-400/20 dark:bg-teal-400/10">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-teal-600 text-xl text-white">
          <FiShield aria-hidden="true" />
        </span>
        <div>
          <p className="flex items-center gap-2 font-black text-teal-900 dark:text-teal-200">
            <FiCheck aria-hidden="true" /> Minh bạch affiliate
          </p>
          <p className="mt-1 text-sm font-semibold leading-6 text-teal-800/80 dark:text-teal-200/75">
            Một số liên kết trên trang là liên kết tiếp thị. Nihongo có thể nhận hoa hồng nhỏ khi bạn mua hàng, và bạn không phải trả thêm chi phí.
          </p>
        </div>
      </aside>
    </div>
  );
}
