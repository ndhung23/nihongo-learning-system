"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FiBarChart2, FiBookOpen, FiChevronDown, FiClipboard, FiCreditCard, FiDatabase, FiEdit3,
  FiHome, FiMail, FiMenu, FiMessageSquare, FiUsers, FiX,
} from "react-icons/fi";

const adminNav = [
  {
    id: "overview",
    label: "Tổng quan",
    items: [
      { label: "Dashboard", href: "/admin", icon: FiBarChart2 },
      { label: "Người dùng", href: "/admin/users", icon: FiUsers },
      { label: "Duyệt thanh toán", href: "/admin/payments", icon: FiCreditCard },
    ],
  },
  {
    id: "content",
    label: "Nội dung",
    items: [
      { label: "Khóa học", href: "/admin/courses", icon: FiBookOpen },
      { label: "Từ vựng", href: "/admin/vocabulary", icon: FiDatabase },
      { label: "Đề thi JLPT", href: "/admin/jlpt-tests", icon: FiClipboard },
      { label: "Highlight JLPT", href: "/admin/jlpt-highlights", icon: FiEdit3 },
    ],
  },
  {
    id: "community",
    label: "Cộng đồng",
    items: [
      { label: "Mẫu câu góp ý", href: "/admin/example-suggestions", icon: FiMessageSquare },
      { label: "Góp ý", href: "/admin/feedback", icon: FiMail },
    ],
  },
];

export function AdminShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  return (
    <main className="min-h-screen bg-[#f6f7fb] text-slate-950">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(225,29,72,0.08),transparent_26%),radial-gradient(circle_at_82%_12%,rgba(20,184,166,0.12),transparent_30%)]" />

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur-xl lg:hidden">
        <Link className="flex items-center gap-2" href="/admin">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-600 text-lg font-black text-white shadow-lg shadow-rose-600/20">管</span>
          <span>
            <strong className="block leading-4">Admin</strong>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-600">Nihongo</span>
          </span>
        </Link>
        <button
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Đóng menu quản trị" : "Mở menu quản trị"}
          className="grid h-11 w-11 place-items-center rounded-xl bg-slate-950 text-xl text-white"
          onClick={() => setMobileOpen((current) => !current)}
          type="button"
        >
          {mobileOpen ? <FiX /> : <FiMenu />}
        </button>
      </header>

      {mobileOpen ? (
        <button aria-label="Đóng menu" className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} type="button" />
      ) : null}

      <div className="relative grid min-h-[calc(100vh-4rem)] lg:min-h-screen lg:grid-cols-[264px_1fr]">
        <AdminSidebar key={pathname} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} pathname={pathname} />
        <section className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</section>
      </div>
    </main>
  );
}

function AdminSidebar({ mobileOpen, onClose, pathname }: { mobileOpen: boolean; onClose: () => void; pathname: string }) {
  const activeGroup = adminNav.find((group) => group.items.some((item) => item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)));
  const [openGroups, setOpenGroups] = useState<string[]>(activeGroup ? [activeGroup.id] : []);

  function toggleGroup(groupId: string) {
    setOpenGroups((current) => current.includes(groupId)
      ? current.filter((id) => id !== groupId)
      : [...current, groupId]);
  }

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[min(86vw,292px)] flex-col border-r border-slate-200 bg-white p-4 shadow-2xl transition-transform duration-300 lg:sticky lg:top-0 lg:z-10 lg:h-screen lg:w-auto lg:translate-x-0 lg:p-5 lg:shadow-[18px_0_70px_rgba(15,23,42,0.06)] ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex items-center justify-between">
        <Link className="group flex items-center gap-3" href="/admin">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-600 text-xl font-black text-white shadow-lg shadow-rose-600/20 transition group-hover:rotate-3">管</span>
          <span>
            <span className="block text-xl font-black tracking-tight">Admin</span>
            <span className="block text-[10px] font-black uppercase tracking-[0.24em] text-teal-600">Nihongo</span>
          </span>
        </Link>
        <button aria-label="Đóng menu" className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-lg lg:hidden" onClick={onClose} type="button"><FiX /></button>
      </div>

      <nav className="mt-6 flex-1 space-y-5 overflow-y-auto pr-1">
        {adminNav.map((group) => (
          <div key={group.label}>
            <button
              aria-controls={`admin-nav-${group.id}`}
              aria-expanded={openGroups.includes(group.id)}
              className="mb-1 flex h-9 w-full items-center justify-between rounded-xl px-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              onClick={() => toggleGroup(group.id)}
              type="button"
            >
              {group.label}
              <FiChevronDown className={`text-sm transition-transform duration-200 ${openGroups.includes(group.id) ? "rotate-180" : ""}`} />
            </button>
            <div className={`grid transition-[grid-template-rows,opacity] duration-200 ${openGroups.includes(group.id) ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-60"}`} id={`admin-nav-${group.id}`}>
              <div className="min-h-0 space-y-1 overflow-hidden">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
                return (
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-black transition ${active ? "bg-slate-950 text-white shadow-lg shadow-slate-900/15" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}
                    href={item.href}
                    key={item.href}
                    onClick={onClose}
                  >
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600 group-hover:bg-white"}`}><Icon /></span>
                    {item.label}
                  </Link>
                );
              })}
              </div>
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-4 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3">
        <p className="text-sm font-black text-teal-900">Khu vực quản trị</p>
        <p className="mt-1 text-xs leading-5 text-teal-800">Mọi thao tác ghi dữ liệu đều được kiểm tra quyền.</p>
      </div>
      <Link className="mt-3 flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 text-sm font-black text-white hover:bg-rose-600" href="/flashcards">
        <FiHome /> Về app học
      </Link>
    </aside>
  );
}
