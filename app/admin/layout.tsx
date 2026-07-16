import Link from "next/link";
import { redirect } from "next/navigation";
import { FiBarChart2, FiBookOpen, FiDatabase, FiHome, FiUsers } from "react-icons/fi";
import { AuthError, requirePermission } from "@/lib/auth/session";

const adminNav = [
  { label: "Dashboard", href: "/admin", icon: FiBarChart2 },
  { label: "Người dùng", href: "/admin/users", icon: FiUsers },
  { label: "Khóa học", href: "/admin/courses", icon: FiBookOpen },
  { label: "Từ vựng", href: "/admin/vocabulary", icon: FiDatabase },
];

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  try {
    await requirePermission("admin:stats:read");
  } catch (error) {
    if (error instanceof AuthError && error.code === "UNAUTHORIZED") {
      redirect("/login");
    }

    redirect("/flashcards");
  }

  return (
    <main className="min-h-screen bg-[#f6f7fb] text-slate-950">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(225,29,72,0.08),transparent_26%),radial-gradient(circle_at_82%_12%,rgba(20,184,166,0.12),transparent_30%)]" />
      <div className="relative grid min-h-screen lg:grid-cols-[292px_1fr]">
        <aside className="hidden border-r border-slate-200/80 bg-white/88 p-5 shadow-[18px_0_70px_rgba(15,23,42,0.06)] backdrop-blur-xl lg:flex lg:flex-col">
          <Link className="group mb-8 flex items-center gap-3" href="/admin">
            <span className="grid h-14 w-14 place-items-center rounded-[1.35rem] bg-rose-600 text-2xl font-black text-white shadow-xl shadow-rose-600/20 transition duration-300 group-hover:-translate-y-1 group-hover:rotate-3">
              管
            </span>
            <span>
              <span className="block text-2xl font-black tracking-tight">Admin</span>
              <span className="block text-xs font-black uppercase tracking-[0.24em] text-teal-600">Nihongo</span>
            </span>
          </Link>

          <nav className="space-y-2">
            {adminNav.map((item) => {
              const Icon = item.icon;
              return (
                <Link className="group flex h-13 items-center gap-3 rounded-2xl px-4 font-black text-slate-600 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-950 hover:text-white hover:shadow-xl hover:shadow-slate-900/10" href={item.href} key={item.href}>
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-700 transition group-hover:bg-white/15 group-hover:text-white">
                    <Icon />
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 rounded-[1.5rem] border border-teal-200 bg-teal-50 p-4">
            <p className="font-black text-teal-900">Quyền hiện tại</p>
            <p className="mt-2 text-sm leading-6 text-teal-800">Bạn đang ở khu vực quản trị. Các hành động ghi dữ liệu đều được kiểm tra quyền server-side.</p>
          </div>

          <Link className="mt-auto flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 font-black text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-rose-600" href="/flashcards">
            <FiHome /> Về app học
          </Link>
        </aside>

        <section className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</section>
      </div>
    </main>
  );
}
