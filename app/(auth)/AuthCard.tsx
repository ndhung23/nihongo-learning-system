import Link from "next/link";

export function AuthCard({
  children,
  subtitle,
  title,
}: Readonly<{
  children: React.ReactNode;
  subtitle: string;
  title: string;
}>) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#fbfaf5] px-4 py-10 text-slate-950">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(225,29,72,0.10),transparent_28%),radial-gradient(circle_at_80%_18%,rgba(20,184,166,0.14),transparent_32%)]" />
      <section className="relative w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/10">
        <Link className="mb-8 flex items-center gap-3" href="/flashcards">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-600 text-2xl font-black text-white">日</span>
          <span>
            <span className="block text-2xl font-black">Nihongo</span>
            <span className="block text-xs font-black uppercase tracking-[0.24em] text-teal-600">Learning</span>
          </span>
        </Link>
        <p className="text-xs font-black uppercase tracking-[0.24em] text-rose-600">Tài khoản</p>
        <h1 className="mt-2 text-3xl font-black">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
        {children}
      </section>
    </main>
  );
}
