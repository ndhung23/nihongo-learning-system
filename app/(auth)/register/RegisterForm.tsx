"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function RegisterForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.message || "Không thể đăng ký.");
        return;
      }

      router.push("/flashcards");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
      <label className="block">
        <span className="mb-2 block text-sm font-black text-slate-700">Username</span>
        <input autoComplete="username" className="h-12 w-full rounded-2xl border border-slate-200 px-4 font-semibold outline-none transition focus:border-teal-400 focus:shadow-lg focus:shadow-teal-500/10" maxLength={32} minLength={3} onChange={(event) => setUsername(event.target.value)} pattern="[a-zA-Z0-9_]+" placeholder="vd: nihongo_user" required title="Chỉ dùng chữ, số và dấu gạch dưới; không nhập email." value={username} />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-black text-slate-700">Email</span>
        <input autoComplete="email" className="h-12 w-full rounded-2xl border border-slate-200 px-4 font-semibold outline-none transition focus:border-teal-400 focus:shadow-lg focus:shadow-teal-500/10" onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required type="email" value={email} />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-black text-slate-700">Mật khẩu</span>
        <input autoComplete="new-password" className="h-12 w-full rounded-2xl border border-slate-200 px-4 font-semibold outline-none transition focus:border-teal-400 focus:shadow-lg focus:shadow-teal-500/10" minLength={8} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
      </label>
      {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}
      <button className="h-12 w-full rounded-2xl bg-teal-700 font-black text-white shadow-xl shadow-teal-600/20 transition hover:-translate-y-0.5 hover:bg-teal-800 disabled:opacity-60" disabled={loading} type="submit">
        {loading ? "Đang tạo..." : "Tạo tài khoản"}
      </button>
      <p className="text-center text-sm font-bold text-slate-500">
        Đã có tài khoản? <Link className="text-rose-600 hover:text-rose-700" href="/login">Đăng nhập</Link>
      </p>
    </form>
  );
}
