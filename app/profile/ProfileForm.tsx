"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { FiLock, FiSave, FiUser } from "react-icons/fi";

type ProfileUser = {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  roles: string[];
  profile?: {
    gender?: "male" | "female" | "other" | "unknown";
    phone?: string;
    birthday?: string;
  };
};

type ProfileFormState = {
  displayName: string;
  email: string;
  avatarUrl: string;
  phone: string;
  gender: "male" | "female" | "other" | "unknown";
  birthday: string;
  currentPassword: string;
  newPassword: string;
};

export function ProfileForm({ user }: Readonly<{ user: ProfileUser }>) {
  const router = useRouter();
  const [form, setForm] = useState<ProfileFormState>({
    displayName: user.displayName || user.username,
    email: user.email,
    avatarUrl: user.avatarUrl || "",
    phone: user.profile?.phone || "",
    gender: user.profile?.gender || "unknown",
    birthday: user.profile?.birthday || "",
    currentPassword: "",
    newPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Không thể cập nhật hồ sơ.");
        return;
      }

      setForm((current) => ({ ...current, currentPassword: "", newPassword: "" }));
      setSuccess("Đã cập nhật hồ sơ cá nhân.");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="grid gap-6 lg:grid-cols-[1fr_360px]" onSubmit={submitProfile}>
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/[0.04]">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-50 text-teal-700">
            <FiUser />
          </span>
          <div>
            <h2 className="text-xl font-black text-slate-950">Thông tin cá nhân</h2>
            <p className="text-sm font-semibold text-slate-500">Các thông tin này dùng cho học tập và hiển thị trong app.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <ProfileInput disabled label="Username" onChange={() => undefined} value={user.username} />
          <ProfileInput label="Email" onChange={(value) => setForm({ ...form, email: value })} type="email" value={form.email} />
          <ProfileInput label="Tên hiển thị" onChange={(value) => setForm({ ...form, displayName: value })} value={form.displayName} />
          <ProfileInput label="Số điện thoại" onChange={(value) => setForm({ ...form, phone: value })} value={form.phone} />
          <label>
            <span className="mb-2 block text-sm font-black text-slate-700">Giới tính</span>
            <select className="h-12 w-full rounded-2xl border border-slate-200 px-4 font-semibold outline-none transition focus:border-teal-400" onChange={(event) => setForm({ ...form, gender: event.target.value as ProfileFormState["gender"] })} value={form.gender}>
              <option value="unknown">Chưa rõ</option>
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
              <option value="other">Khác</option>
            </select>
          </label>
          <ProfileInput label="Ngày sinh" onChange={(value) => setForm({ ...form, birthday: value })} type="date" value={form.birthday} />
          <label className="sm:col-span-2">
            <span className="mb-2 block text-sm font-black text-slate-700">Avatar URL</span>
            <input className="h-12 w-full rounded-2xl border border-slate-200 px-4 font-semibold outline-none transition focus:border-teal-400" onChange={(event) => setForm({ ...form, avatarUrl: event.target.value })} placeholder="https://..." value={form.avatarUrl} />
          </label>
        </div>
      </section>

      <aside className="space-y-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/[0.04]">
          <div className="flex items-center gap-3">
            <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-3xl bg-rose-600 text-2xl font-black text-white shadow-xl shadow-rose-600/20">
              {form.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={form.displayName} className="h-full w-full object-cover" src={form.avatarUrl} />
              ) : (
                user.username.slice(0, 1).toUpperCase()
              )}
            </div>
            <div>
              <p className="text-lg font-black text-slate-950">{form.displayName || user.username}</p>
              <p className="text-sm font-semibold text-slate-500">@{user.username}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {user.roles.map((role) => (
              <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-black uppercase text-teal-700" key={role}>
                {role}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/[0.04]">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-50 text-rose-700">
              <FiLock />
            </span>
            <div>
              <h2 className="font-black text-slate-950">Đổi mật khẩu</h2>
              <p className="text-sm font-semibold text-slate-500">Bỏ trống nếu chưa cần đổi.</p>
            </div>
          </div>
          <div className="mt-5 space-y-4">
            <ProfileInput label="Mật khẩu hiện tại" onChange={(value) => setForm({ ...form, currentPassword: value })} type="password" value={form.currentPassword} />
            <ProfileInput label="Mật khẩu mới" onChange={(value) => setForm({ ...form, newPassword: value })} type="password" value={form.newPassword} />
          </div>
        </section>
      </aside>

      <div className="lg:col-span-2">
        {error && <p className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}
        {success && <p className="mb-4 rounded-2xl bg-teal-50 px-4 py-3 text-sm font-bold text-teal-700">{success}</p>}
        <button className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 font-black text-white shadow-xl shadow-rose-600/20 transition hover:-translate-y-0.5 hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={loading} type="submit">
          <FiSave /> {loading ? "Đang lưu..." : "Lưu hồ sơ"}
        </button>
      </div>
    </form>
  );
}

function ProfileInput({
  disabled,
  label,
  onChange,
  type = "text",
  value,
}: Readonly<{
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  type?: string;
  value: string;
}>) {
  return (
    <label>
      <span className="mb-2 block text-sm font-black text-slate-700">{label}</span>
      <input className="h-12 w-full rounded-2xl border border-slate-200 px-4 font-semibold outline-none transition focus:border-teal-400 disabled:bg-slate-100 disabled:text-slate-400" disabled={disabled} onChange={(event) => onChange(event.target.value)} type={type} value={value} />
    </label>
  );
}
