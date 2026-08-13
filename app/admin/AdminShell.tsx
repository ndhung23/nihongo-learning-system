"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FiBarChart2, FiBook, FiBookOpen, FiChevronDown, FiClipboard, FiCreditCard, FiDatabase, FiEdit3,
  FiFileText, FiHome, FiKey, FiLayers, FiMail, FiMenu, FiMessageSquare, FiPlus, FiSettings, FiShield, FiShoppingBag, FiUsers, FiX,
} from "react-icons/fi";
import type { IconType } from "react-icons";

type AdminNavChild = { label: string; href: string; icon: IconType };
type AdminNavItem = {
  label: string;
  icon: IconType;
  permission: string;
  href?: string;
  id?: string;
  children?: AdminNavChild[];
};

const adminNav: Array<{ id: string; label: string; items: AdminNavItem[] }> = [
  {
    id: "overview",
    label: "Tổng quan",
    items: [
      { label: "Dashboard", href: "/admin", icon: FiBarChart2, permission: "admin:dashboard:read" },
      { label: "Người dùng", href: "/admin/users", icon: FiUsers, permission: "admin:user:read" },
      { label: "Duyệt thanh toán", href: "/admin/payments", icon: FiCreditCard, permission: "admin:payment:read" },
    ],
  },
  {
    id: "content",
    label: "Nội dung",
    items: [
      { label: "Khóa học", href: "/admin/courses", icon: FiBookOpen, permission: "admin:course:read" },
      { label: "Sản phẩm Shopee", href: "/admin/affiliate-products", icon: FiShoppingBag, permission: "admin:affiliate-product:read" },
      {
        id: "create-course",
        label: "Tạo khóa học",
        icon: FiPlus,
        permission: "admin:course:create",
        children: [
          { label: "Khóa học cơ bản", href: "/admin/courses?category=basic", icon: FiBook },
          { label: "Luyện viết Kanji", href: "/admin/courses?category=kanji", icon: FiEdit3 },
          { label: "Khóa học Flashcard", href: "/admin/courses?category=flashcard", icon: FiFileText },
          { label: "Khóa học lộ trình", href: "/admin/courses?category=roadmap", icon: FiLayers },
          { label: "Đề thi", href: "/admin/courses?category=test", icon: FiClipboard },
        ],
      },
      { label: "Từ vựng", href: "/admin/vocabulary", icon: FiDatabase, permission: "admin:vocabulary:read" },
      { label: "Đề thi JLPT", href: "/admin/jlpt-tests", icon: FiClipboard, permission: "admin:jlpt-test:read" },
      { label: "Highlight JLPT", href: "/admin/jlpt-highlights", icon: FiEdit3, permission: "admin:jlpt-highlight:read" },
    ],
  },
  {
    id: "community",
    label: "Cộng đồng",
    items: [
      { label: "Mẫu câu góp ý", href: "/admin/example-suggestions", icon: FiMessageSquare, permission: "admin:example-suggestion:read" },
      { label: "Góp ý", href: "/admin/feedback", icon: FiMail, permission: "admin:feedback:read" },
    ],
  },
  { id: "master-data", label: "Master Data", items: [{ label: "Quản lý dữ liệu", href: "/admin/master-data", icon: FiDatabase, permission: "admin:master-data:read" }] },
  { id: "system", label: "Cài đặt hệ thống", items: [
    { label: "Vai trò & phân quyền", href: "/admin/settings/roles", icon: FiShield, permission: "admin:role:read" },
    { label: "Phân quyền chức năng", href: "/admin/settings/permissions", icon: FiKey, permission: "admin:permission:read" },
    { label: "Cấu hình hệ thống", href: "/admin/settings/general", icon: FiSettings, permission: "admin:settings:read" },
  ] },
];

export function AdminShell({ children, permissions }: Readonly<{ children: React.ReactNode; permissions: string[] }>) {
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
        <AdminSidebar key={pathname} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} pathname={pathname} permissions={permissions} />
        <section className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</section>
      </div>
    </main>
  );
}

function AdminSidebar({ mobileOpen, onClose, pathname, permissions }: { mobileOpen: boolean; onClose: () => void; pathname: string; permissions: string[] }) {
  const visibleNav = adminNav.map((group) => ({ ...group, items: group.items.filter((item) => permissions.includes(item.permission)) })).filter((group) => group.items.length > 0);
  const activeGroup = visibleNav.find((group) => group.items.some((item) => item.href && (item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href))));
  const [openGroups, setOpenGroups] = useState<string[]>(activeGroup ? [activeGroup.id] : []);
  const [openItems, setOpenItems] = useState<string[]>([]);

  function toggleGroup(groupId: string) {
    setOpenGroups((current) => current.includes(groupId)
      ? current.filter((id) => id !== groupId)
      : [...current, groupId]);
  }

  function toggleItem(itemId: string) {
    setOpenItems((current) => current.includes(itemId)
      ? current.filter((id) => id !== itemId)
      : [...current, itemId]);
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
        {visibleNav.map((group) => (
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
                if (item.children && item.id) {
                  const expanded = openItems.includes(item.id);
                  return (
                    <div key={item.id}>
                      <button
                        aria-expanded={expanded}
                        className="group flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-black text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
                        onClick={() => toggleItem(item.id!)}
                        type="button"
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-600 group-hover:bg-white"><Icon /></span>
                        <span className="flex-1 text-left">{item.label}</span>
                        <FiChevronDown className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
                      </button>
                      <div className={`grid transition-[grid-template-rows,opacity] duration-200 ${expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-60"}`}>
                        <div className="min-h-0 overflow-hidden">
                          <div className="ml-7 mt-1 space-y-1 border-l border-slate-200 pl-3">
                            {item.children.map((child) => {
                              const ChildIcon = child.icon;
                              return (
                                <Link className="group flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold text-slate-500 transition hover:bg-rose-50 hover:text-rose-700" href={child.href} key={child.href} onClick={onClose}>
                                  <ChildIcon className="shrink-0" /> {child.label}
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (!item.href) return null;
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
