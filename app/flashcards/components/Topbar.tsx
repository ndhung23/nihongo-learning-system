"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  FiBell,
  FiChevronDown,
  FiLogIn,
  FiLogOut,
  FiSearch,
  FiShield,
  FiUser,
  FiX,
} from "react-icons/fi";

type CurrentUser = {
  userId?: string;
  id?: string;
  username: string;
  email: string;
  displayName?: string;
  roles: string[];
  permissions?: string[];
};

export function Topbar() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void loadMe();
  }, []);

  async function loadMe() {
    const response = await fetch("/api/auth/me", { cache: "no-store" });

    if (!response.ok) {
      setUser(null);
      return;
    }

    const payload = (await response.json()) as { user: CurrentUser };
    setUser(payload.user);
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.message || "Không thể đăng nhập.");
        return;
      }

      setUser(payload.user);
      setLoginOpen(false);
      setMenuOpen(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setMenuOpen(false);
  }

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[#fbfaf5]/88 backdrop-blur-2xl">
        <div className="mx-auto flex h-20 max-w-[1500px] items-center gap-4 px-4 sm:px-6 lg:px-10">
          <label className="group hidden h-12 w-full max-w-xl items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm transition-all duration-300 focus-within:border-teal-400 focus-within:shadow-lg focus-within:shadow-teal-500/10 md:flex">
            <FiSearch className="text-slate-400 transition group-focus-within:text-teal-600" />
            <input className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-slate-400" placeholder="Tìm bộ từ, kanji, ngữ pháp..." />
          </label>

          <div className="ml-auto flex items-center gap-2">
            <button className="h-10 rounded-full border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition-all duration-300 hover:-translate-y-0.5 hover:border-teal-300 hover:text-teal-700 hover:shadow-lg hover:shadow-teal-500/10" type="button">
              VI <FiChevronDown className="ml-1 inline" />
            </button>
            <button className="relative grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 transition-all duration-300 hover:-translate-y-0.5 hover:text-rose-600 hover:shadow-lg hover:shadow-rose-500/10" type="button">
              <FiBell />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" />
            </button>

            {user ? (
              <div className="relative">
                <button
                  className="flex h-11 items-center gap-3 rounded-full bg-teal-700 pl-2 pr-4 text-sm font-black text-white ring-4 ring-teal-100 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-teal-600/20"
                  onClick={() => setMenuOpen((value) => !value)}
                  type="button"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-white/15">
                    {user.username.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="hidden sm:inline">{user.username}</span>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-14 w-72 rounded-3xl border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-900/12">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="font-black text-slate-950">{user.displayName || user.username}</p>
                      <p className="mt-1 text-sm text-slate-500">{user.email}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {user.roles.map((role) => (
                          <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-black text-teal-700" key={role}>
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button className="mt-2 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-bold text-slate-600 transition hover:bg-slate-50 hover:text-teal-700" type="button">
                      <FiUser /> Hồ sơ cá nhân
                    </button>
                    {user.roles.includes("admin") && (
                      <Link className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-bold text-slate-600 transition hover:bg-slate-50 hover:text-rose-700" href="/admin">
                        <FiShield /> Quản trị hệ thống
                      </Link>
                    )}
                    <button className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-bold text-rose-600 transition hover:bg-rose-50" onClick={handleLogout} type="button">
                      <FiLogOut /> Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                className="flex h-11 items-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-black text-white shadow-xl shadow-slate-900/12 transition-all duration-300 hover:-translate-y-0.5 hover:bg-rose-600 hover:shadow-rose-600/20"
                onClick={() => setLoginOpen(true)}
                type="button"
              >
                <FiLogIn /> Đăng nhập
              </button>
            )}
          </div>
        </div>
      </header>

      {loginOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <form className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl shadow-slate-950/20" onSubmit={handleLogin}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-rose-600">Nihongo</p>
                <h2 className="mt-2 text-3xl font-black">Đăng nhập</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">Đăng nhập bằng tài khoản đã được cấp quyền.</p>
              </div>
              <button className="grid h-10 w-10 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-950" onClick={() => setLoginOpen(false)} type="button">
                <FiX />
              </button>
            </div>

            <label className="mt-6 block">
              <span className="mb-2 block text-sm font-black text-slate-700">Username hoặc email</span>
              <input
                className="h-12 w-full rounded-2xl border border-slate-200 px-4 font-semibold outline-none transition focus:border-teal-400 focus:shadow-lg focus:shadow-teal-500/10"
                onChange={(event) => setLogin(event.target.value)}
                value={login}
              />
            </label>
            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-black text-slate-700">Mật khẩu</span>
              <input
                className="h-12 w-full rounded-2xl border border-slate-200 px-4 font-semibold outline-none transition focus:border-teal-400 focus:shadow-lg focus:shadow-teal-500/10"
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
            </label>

            {error && <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}

            <button
              className="mt-6 h-12 w-full rounded-2xl bg-rose-600 font-black text-white shadow-xl shadow-rose-600/20 transition hover:-translate-y-0.5 hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
              type="submit"
            >
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
            <div className="mt-4 flex justify-between text-sm font-bold">
              <Link className="text-teal-700 hover:text-teal-900" href="/register" onClick={() => setLoginOpen(false)}>
                Tạo tài khoản
              </Link>
              <Link className="text-slate-500 hover:text-rose-700" href="/forgot-password" onClick={() => setLoginOpen(false)}>
                Quên mật khẩu?
              </Link>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
