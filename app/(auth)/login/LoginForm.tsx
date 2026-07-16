"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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

      router.push(payload.user.roles.includes("admin") ? "/admin" : "/flashcards");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
      <label className="block">
        <span className="mb-2 block text-sm font-black text-slate-700">Username hoặc email</span>
        <input className="h-12 w-full rounded-2xl border border-slate-200 px-4 font-semibold outline-none transition focus:border-teal-400 focus:shadow-lg focus:shadow-teal-500/10" onChange={(event) => setLogin(event.target.value)} value={login} />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-black text-slate-700">Mật khẩu</span>
        <input className="h-12 w-full rounded-2xl border border-slate-200 px-4 font-semibold outline-none transition focus:border-teal-400 focus:shadow-lg focus:shadow-teal-500/10" onChange={(event) => setPassword(event.target.value)} type="password" value={password} />
      </label>
      {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}
      <button className="h-12 w-full rounded-2xl bg-rose-600 font-black text-white shadow-xl shadow-rose-600/20 transition hover:-translate-y-0.5 hover:bg-rose-700 disabled:opacity-60" disabled={loading} type="submit">
        {loading ? "Đang đăng nhập..." : "Đăng nhập"}
      </button>
      <div className="flex justify-between text-sm font-bold">
        <Link className="text-teal-700 hover:text-teal-900" href="/register">Tạo tài khoản</Link>
        <Link className="text-slate-500 hover:text-rose-700" href="/forgot-password">Quên mật khẩu?</Link>
      </div>
    </form>
  );
}
