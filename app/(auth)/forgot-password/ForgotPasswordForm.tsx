"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setResetUrl("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.message || "Không thể tạo link đặt lại mật khẩu.");
        return;
      }

      setMessage(payload.message);
      setResetUrl(payload.devResetUrl || "");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
      <label className="block">
        <span className="mb-2 block text-sm font-black text-slate-700">Email</span>
        <input className="h-12 w-full rounded-2xl border border-slate-200 px-4 font-semibold outline-none transition focus:border-teal-400 focus:shadow-lg focus:shadow-teal-500/10" onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" type="email" value={email} />
      </label>
      {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}
      {message && <p className="rounded-2xl bg-teal-50 px-4 py-3 text-sm font-bold text-teal-700">{message}</p>}
      {resetUrl && (
        <Link className="block break-all rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-rose-600 hover:text-rose-700" href={resetUrl}>
          Link dev: {resetUrl}
        </Link>
      )}
      <button className="h-12 w-full rounded-2xl bg-rose-600 font-black text-white shadow-xl shadow-rose-600/20 transition hover:-translate-y-0.5 hover:bg-rose-700 disabled:opacity-60" disabled={loading} type="submit">
        {loading ? "Đang gửi..." : "Gửi link đặt lại mật khẩu"}
      </button>
      <Link className="block text-center text-sm font-bold text-slate-500 hover:text-teal-700" href="/login">
        Quay lại đăng nhập
      </Link>
    </form>
  );
}
