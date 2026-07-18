"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FiEdit3, FiPlus, FiSearch, FiTrash2, FiX } from "react-icons/fi";
import type { Role } from "@/lib/auth/permissions";

type AdminUser = {
  _id: string;
  username: string;
  email: string;
  displayName?: string;
  roles: Role[];
  status: "active" | "inactive" | "banned" | "pending_verify";
  profile?: {
    gender?: "male" | "female" | "other" | "unknown";
    phone?: string;
  };
  createdAt?: string;
  aiCredits?: number;
  pendingGachaTickets?: number;
};

type Meta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type UserFormState = {
  id?: string;
  username: string;
  email: string;
  password: string;
  displayName: string;
  phone: string;
  gender: "male" | "female" | "other" | "unknown";
  role: Role;
  status: "active" | "inactive" | "banned" | "pending_verify";
  addAiCredits: string;
  addGachaTickets: string;
};

const emptyForm: UserFormState = {
  username: "",
  email: "",
  password: "",
  displayName: "",
  phone: "",
  gender: "unknown",
  role: "user",
  status: "active",
  addAiCredits: "0",
  addGachaTickets: "0",
};

const roleOptions: Array<{ label: string; value: Role | "all" }> = [
  { label: "Tất cả role", value: "all" },
  { label: "User", value: "user" },
  { label: "VIP", value: "vip" },
  { label: "Creator", value: "creator" },
  { label: "Admin", value: "admin" },
];

const statusOptions = [
  ["Tất cả trạng thái", "all"],
  ["Active", "active"],
  ["Inactive", "inactive"],
  ["Banned", "banned"],
  ["Pending verify", "pending_verify"],
] as const;

const genderOptions = [
  ["Tất cả giới tính", "all"],
  ["Nam", "male"],
  ["Nữ", "female"],
  ["Khác", "other"],
  ["Chưa rõ", "unknown"],
] as const;

export function AdminUsersClient({ meta, users }: Readonly<{ meta: Meta; users: AdminUser[] }>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const queryState = useMemo(
    () => ({
      q: searchParams.get("q") || "",
      role: searchParams.get("role") || "all",
      status: searchParams.get("status") || "all",
      gender: searchParams.get("gender") || "all",
      limit: searchParams.get("limit") || String(meta.limit),
    }),
    [meta.limit, searchParams],
  );

  function updateQuery(next: Record<string, string | number>) {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(next).forEach(([key, value]) => {
      if (!value || value === "all") {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });

    if (!("page" in next)) {
      params.set("page", "1");
    }

    const query = params.toString();
    router.push(query ? `/admin/users?${query}` : "/admin/users");
  }

  function openCreate() {
    setForm(emptyForm);
    setError("");
    setFormOpen(true);
  }

  function openEdit(user: AdminUser) {
    setForm({
      id: user._id,
      username: user.username,
      email: user.email,
      password: "",
      displayName: user.displayName || "",
      phone: user.profile?.phone || "",
      gender: user.profile?.gender || "unknown",
      role: user.roles[0] || "user",
      status: user.status,
      addAiCredits: "0",
      addGachaTickets: "0",
    });
    setError("");
    setFormOpen(true);
  }

  async function submitUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const isEdit = Boolean(form.id);
      const payload: Record<string, unknown> = {
        email: form.email,
        displayName: form.displayName,
        phone: form.phone,
        gender: form.gender,
        roles: [form.role],
        status: form.status,
        ...(isEdit
          ? {
              addAiCredits: Number(form.addAiCredits) || 0,
              addGachaTickets: Number(form.addGachaTickets) || 0,
            }
          : {
              aiCredits: Number(form.addAiCredits) || 0,
              gachaTickets: Number(form.addGachaTickets) || 0,
            }),
      };

      if (!isEdit) {
        payload.username = form.username;
        payload.password = form.password;
      } else if (form.password) {
        payload.password = form.password;
      }

      const response = await fetch(isEdit ? `/api/admin/users/${form.id}` : "/api/admin/users", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Không thể lưu người dùng.");
        return;
      }

      setFormOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function deleteUser(user: AdminUser) {
    if (!confirm(`Xóa người dùng "${user.username}"?`)) {
      return;
    }

    const response = await fetch(`/api/admin/users/${user._id}`, { method: "DELETE" });

    if (!response.ok) {
      const result = await response.json();
      alert(result.message || "Không thể xóa người dùng.");
      return;
    }

    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-teal-700">Admin</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Quản lý người dùng</h1>
          <p className="mt-3 text-slate-500">CRUD, tìm kiếm, lọc và phân trang tài khoản hệ thống.</p>
        </div>
        <button
          className="flex h-12 items-center gap-2 rounded-2xl bg-rose-600 px-5 font-black text-white shadow-xl shadow-rose-600/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-rose-700"
          onClick={openCreate}
          type="button"
        >
          <FiPlus /> Tạo người dùng
        </button>
      </div>

      <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/[0.04]">
        <div className="grid gap-3 xl:grid-cols-[1fr_180px_180px_180px_120px]">
          <label className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-teal-400 focus-within:bg-white">
            <FiSearch className="text-slate-400" />
            <input
              className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
              defaultValue={queryState.q}
              onKeyDown={(event) => {
                if (event.key === "Enter") updateQuery({ q: event.currentTarget.value });
              }}
              placeholder="Tìm name, SĐT, email..."
            />
          </label>
          <select className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition hover:border-teal-300" defaultValue={queryState.role} onChange={(event) => updateQuery({ role: event.target.value })}>
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition hover:border-teal-300" defaultValue={queryState.status} onChange={(event) => updateQuery({ status: event.target.value })}>
            {statusOptions.map(([label, value]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition hover:border-teal-300" defaultValue={queryState.gender} onChange={(event) => updateQuery({ gender: event.target.value })}>
            {genderOptions.map(([label, value]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition hover:border-teal-300" defaultValue={queryState.limit} onChange={(event) => updateQuery({ limit: event.target.value })}>
            {[10, 20, 50].map((limit) => (
              <option key={limit} value={limit}>
                {limit}/trang
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="mt-5 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/[0.04]">
        <div className="hidden grid-cols-[1.1fr_1.2fr_0.8fr_0.7fr_0.8fr_140px] bg-slate-50 px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-500 lg:grid">
          <span>Người dùng</span>
          <span>Email / SĐT</span>
          <span>Giới tính</span>
          <span>Role</span>
          <span>Trạng thái</span>
          <span className="text-right">Thao tác</span>
        </div>
        {users.map((user) => (
          <div className="grid gap-3 border-t border-slate-100 px-5 py-4 text-sm transition hover:bg-rose-50/50 lg:grid-cols-[1.1fr_1.2fr_0.8fr_0.7fr_0.8fr_140px] lg:items-center" key={user._id}>
            <div>
              <p className="font-black text-slate-950">{user.displayName || user.username}</p>
              <p className="mt-1 text-xs font-bold text-slate-400">@{user.username}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-700">{user.email}</p>
              <p className="mt-1 text-xs font-bold text-slate-400">{user.profile?.phone || "Chưa có SĐT"}</p>
            </div>
            <span className="font-bold text-slate-600">{genderLabel(user.profile?.gender)}</span>
            <span className="w-fit rounded-full bg-teal-50 px-3 py-1 text-xs font-black text-teal-700">{user.roles.join(", ")}</span>
            <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${statusTone(user.status)}`}>{statusLabel(user.status)}</span>
            <div className="flex gap-2 lg:justify-end">
              <button className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-teal-100 hover:text-teal-700" onClick={() => openEdit(user)} title="Sửa" type="button">
                <FiEdit3 />
              </button>
              <button className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-rose-100 hover:text-rose-700" onClick={() => deleteUser(user)} title="Xóa" type="button">
                <FiTrash2 />
              </button>
            </div>
          </div>
        ))}
        {users.length === 0 && (
          <div className="px-5 py-16 text-center">
            <p className="text-lg font-black text-slate-950">Không có người dùng phù hợp</p>
            <p className="mt-2 text-sm text-slate-500">Thử đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
          </div>
        )}
      </section>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-500">
          Tổng {meta.total} người dùng · Trang {meta.page}/{meta.totalPages}
        </p>
        <div className="flex gap-2">
          <button className="h-10 rounded-xl border border-slate-200 bg-white px-4 font-black text-slate-600 transition hover:border-teal-300 disabled:cursor-not-allowed disabled:opacity-50" disabled={meta.page <= 1} onClick={() => updateQuery({ page: meta.page - 1 })} type="button">
            Trước
          </button>
          <button className="h-10 rounded-xl border border-slate-200 bg-white px-4 font-black text-slate-600 transition hover:border-teal-300 disabled:cursor-not-allowed disabled:opacity-50" disabled={meta.page >= meta.totalPages} onClick={() => updateQuery({ page: meta.page + 1 })} type="button">
            Sau
          </button>
        </div>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <form className="w-full max-w-2xl rounded-[2rem] bg-white p-6 shadow-2xl shadow-slate-950/20" onSubmit={submitUser}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-rose-600">User CRUD</p>
                <h2 className="mt-2 text-3xl font-black text-slate-950">{form.id ? "Sửa người dùng" : "Tạo người dùng"}</h2>
              </div>
              <button className="grid h-10 w-10 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-950" onClick={() => setFormOpen(false)} type="button">
                <FiX />
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <AdminInput disabled={Boolean(form.id)} label="Username" onChange={(value) => setForm({ ...form, username: value })} value={form.username} />
              <AdminInput label="Email" onChange={(value) => setForm({ ...form, email: value })} type="email" value={form.email} />
              <AdminInput label={form.id ? "Mật khẩu mới (bỏ trống nếu không đổi)" : "Mật khẩu"} onChange={(value) => setForm({ ...form, password: value })} type="password" value={form.password} />
              <AdminInput label="Tên hiển thị" onChange={(value) => setForm({ ...form, displayName: value })} value={form.displayName} />
              <AdminInput label="Số điện thoại" onChange={(value) => setForm({ ...form, phone: value })} value={form.phone} />
              <label>
                <span className="mb-2 block text-sm font-black text-slate-700">Giới tính</span>
                <select className="h-12 w-full rounded-2xl border border-slate-200 px-4 font-semibold outline-none transition focus:border-teal-400" onChange={(event) => setForm({ ...form, gender: event.target.value as UserFormState["gender"] })} value={form.gender}>
                  {genderOptions.slice(1).map(([label, value]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-2 block text-sm font-black text-slate-700">Role</span>
                <select className="h-12 w-full rounded-2xl border border-slate-200 px-4 font-semibold outline-none transition focus:border-teal-400" onChange={(event) => setForm({ ...form, role: event.target.value as Role })} value={form.role}>
                  {roleOptions.slice(1).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-2 block text-sm font-black text-slate-700">Trạng thái</span>
                <select className="h-12 w-full rounded-2xl border border-slate-200 px-4 font-semibold outline-none transition focus:border-teal-400" onChange={(event) => setForm({ ...form, status: event.target.value as UserFormState["status"] })} value={form.status}>
                  {statusOptions.slice(1).map(([label, value]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <AdminInput
                label={form.id ? "Thêm lượt AI" : "Lượt AI ban đầu"}
                min="0"
                onChange={(value) => setForm({ ...form, addAiCredits: value })}
                type="number"
                value={form.addAiCredits}
              />
              <AdminInput
                label={form.id ? "Thêm vé Gacha" : "Vé Gacha ban đầu"}
                min="0"
                onChange={(value) => setForm({ ...form, addGachaTickets: value })}
                type="number"
                value={form.addGachaTickets}
              />
            </div>

            {error && <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button className="h-12 rounded-2xl border border-slate-200 px-5 font-black text-slate-600 transition hover:bg-slate-50" onClick={() => setFormOpen(false)} type="button">
                Hủy
              </button>
              <button className="h-12 rounded-2xl bg-rose-600 px-6 font-black text-white shadow-xl shadow-rose-600/20 transition hover:-translate-y-0.5 hover:bg-rose-700 disabled:opacity-60" disabled={loading} type="submit">
                {loading ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function AdminInput({
  disabled,
  label,
  min,
  onChange,
  type = "text",
  value,
}: Readonly<{
  disabled?: boolean;
  label: string;
  min?: string;
  onChange: (value: string) => void;
  type?: string;
  value: string;
}>) {
  return (
    <label>
      <span className="mb-2 block text-sm font-black text-slate-700">{label}</span>
      <input className="h-12 w-full rounded-2xl border border-slate-200 px-4 font-semibold outline-none transition focus:border-teal-400 disabled:bg-slate-100 disabled:text-slate-400" disabled={disabled} min={min} onChange={(event) => onChange(event.target.value)} type={type} value={value} />
    </label>
  );
}

function genderLabel(gender?: string) {
  const labels: Record<string, string> = {
    male: "Nam",
    female: "Nữ",
    other: "Khác",
    unknown: "Chưa rõ",
  };

  return labels[gender || "unknown"] || labels.unknown;
}

function statusLabel(status: AdminUser["status"]) {
  return {
    active: "Active",
    inactive: "Inactive",
    banned: "Banned",
    pending_verify: "Pending",
  }[status];
}

function statusTone(status: AdminUser["status"]) {
  return {
    active: "bg-teal-50 text-teal-700",
    inactive: "bg-slate-100 text-slate-600",
    banned: "bg-rose-50 text-rose-700",
    pending_verify: "bg-amber-50 text-amber-700",
  }[status];
}
