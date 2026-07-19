"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const token = searchParams.get("token") || "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (password !== passwordConfirmation) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.message || "Không thể đặt lại mật khẩu.");
        return;
      }

      setMessage(payload.message);
      setTimeout(() => router.push("/login"), 800);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
      {!token && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">Thiếu token đặt lại mật khẩu.</p>}
      <label className="block">
        <span className="mb-2 block text-sm font-black text-slate-700">Mật khẩu mới</span>
        <input autoComplete="new-password" className="h-12 w-full rounded-2xl border border-slate-200 px-4 font-semibold outline-none transition focus:border-teal-400 focus:shadow-lg focus:shadow-teal-500/10" minLength={8} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-black text-slate-700">Xác nhận mật khẩu mới</span>
        <input autoComplete="new-password" className="h-12 w-full rounded-2xl border border-slate-200 px-4 font-semibold outline-none transition focus:border-teal-400 focus:shadow-lg focus:shadow-teal-500/10" minLength={8} onChange={(event) => setPasswordConfirmation(event.target.value)} required type="password" value={passwordConfirmation} />
      </label>
      {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}
      {message && <p className="rounded-2xl bg-teal-50 px-4 py-3 text-sm font-bold text-teal-700">{message}</p>}
      <button className="h-12 w-full rounded-2xl bg-teal-700 font-black text-white shadow-xl shadow-teal-600/20 transition hover:-translate-y-0.5 hover:bg-teal-800 disabled:opacity-60" disabled={loading || !token} type="submit">
        {loading ? "Đang lưu..." : "Đặt lại mật khẩu"}
      </button>
      <Link className="block text-center text-sm font-bold text-slate-500 hover:text-teal-700" href="/login">
        Quay lại đăng nhập
      </Link>
    </form>
  );
}
