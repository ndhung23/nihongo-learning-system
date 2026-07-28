"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { FiAward, FiCheck, FiLink, FiLock, FiSave, FiUploadCloud, FiUser, FiX } from "react-icons/fi";

type ProfileUser = {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  roles: string[];
  vipUntil?: string;
  isVip: boolean;
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
  const [avatarMode, setAvatarMode] = useState<"upload" | "url">("upload");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const isVip = user.isVip;

  async function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError("");
    setSuccess("");
    setAvatarUploading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("purpose", "avatar");
      const response = await fetch("/api/uploads/image", { method: "POST", body });
      const result = (await response.json()) as { data?: { url?: string }; message?: string };
      if (!response.ok || !result.data?.url) {
        throw new Error(result.message || "Không thể tải avatar lên.");
      }
      setForm((current) => ({ ...current, avatarUrl: result.data?.url || "" }));
      setSuccess("Đã tải avatar lên. Nhấn “Lưu hồ sơ” để áp dụng.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Không thể tải avatar lên.");
    } finally {
      setAvatarUploading(false);
    }
  }

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
          <ProfileInput label="Số điện thoại" onChange={(value) => setForm({ ...form, phone: value })} type="tel" value={form.phone} />
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
          <div className="sm:col-span-2">
            <span className="mb-2 block text-sm font-black text-slate-700">Ảnh đại diện</span>
            <div className="mb-3 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
              <button
                className={`flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-black transition ${avatarMode === "upload" ? "bg-white text-teal-700 shadow-sm" : "text-slate-500"}`}
                onClick={() => setAvatarMode("upload")}
                type="button"
              >
                <FiUploadCloud /> Tải ảnh từ máy
              </button>
              <button
                className={`flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-black transition ${avatarMode === "url" ? "bg-white text-teal-700 shadow-sm" : "text-slate-500"}`}
                onClick={() => setAvatarMode("url")}
                type="button"
              >
                <FiLink /> Dùng link URL
              </button>
            </div>

            {avatarMode === "upload" ? (
              <label className="flex min-h-24 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-teal-200 bg-teal-50/60 px-4 text-center font-black text-teal-700 transition hover:border-teal-400 hover:bg-teal-50">
                <span><FiUploadCloud className="mx-auto mb-2 text-xl" />{avatarUploading ? "Đang tải lên Cloudinary..." : "Chọn ảnh JPG, PNG, WebP hoặc GIF"}</span>
                <input accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" disabled={avatarUploading} onChange={uploadAvatar} type="file" />
              </label>
            ) : (
              <input
                className="h-12 w-full rounded-2xl border border-slate-200 px-4 font-semibold outline-none transition focus:border-teal-400"
                onChange={(event) => setForm({ ...form, avatarUrl: event.target.value })}
                placeholder="https://example.com/avatar.jpg"
                type="url"
                value={form.avatarUrl}
              />
            )}

            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-slate-400">Ảnh tải từ máy tối đa 5 MB.</p>
              {form.avatarUrl ? (
                <button className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-black text-rose-600 hover:bg-rose-50" onClick={() => setForm({ ...form, avatarUrl: "" })} type="button">
                  <FiX /> Xóa avatar
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <aside className="space-y-6">
        <section className={`overflow-hidden rounded-[2rem] border bg-white p-5 shadow-xl shadow-slate-900/[0.04] ${isVip ? "border-amber-200" : "border-slate-200"}`}>
          {isVip && (
            <div className="-mx-5 -mt-5 mb-5 bg-gradient-to-r from-violet-700 via-fuchsia-600 to-amber-500 px-5 py-4 text-white">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/70">Thành viên đặc biệt</p>
                  <p className="mt-1 flex items-center gap-2 text-lg font-black"><FiAward /> NIHONGO VIP</p>
                </div>
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-black">ACTIVE</span>
              </div>
              <p className="mt-3 text-xs font-semibold text-white/85">
                {user.vipUntil
                  ? `Đặc quyền của bạn có hiệu lực đến ${new Intl.DateTimeFormat("vi-VN").format(new Date(user.vipUntil))}.`
                  : "Đặc quyền VIP của bạn đang hoạt động."}
              </p>
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className={`grid h-16 w-16 place-items-center overflow-hidden rounded-3xl text-2xl font-black text-white shadow-xl ${isVip ? "bg-violet-700 ring-4 ring-amber-200 shadow-violet-600/20" : "bg-rose-600 shadow-rose-600/20"}`}>
              {form.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={form.displayName} className="h-full w-full object-cover" src={form.avatarUrl} />
              ) : (
                user.username.slice(0, 1).toUpperCase()
              )}
            </div>
            <div>
              <p className="flex items-center gap-2 text-lg font-black text-slate-950">
                {form.displayName || user.username}
                {isVip && <FiAward className="text-amber-500" aria-label="VIP" />}
              </p>
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
          {isVip && (
            <div className="mt-4 grid gap-2 rounded-2xl bg-violet-50 p-3 text-xs font-bold text-violet-800">
              <p className="flex items-center gap-2"><FiCheck className="text-emerald-600" /> Huy hiệu VIP nổi bật trên tài khoản</p>
              <p className="flex items-center gap-2"><FiCheck className="text-emerald-600" /> 100 lượt AI cho mỗi tháng VIP</p>
            </div>
          )}
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
