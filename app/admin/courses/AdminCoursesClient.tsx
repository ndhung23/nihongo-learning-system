"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FiArchive, FiEdit3, FiEye, FiEyeOff, FiPlus, FiSearch, FiTrash2, FiUploadCloud, FiX } from "react-icons/fi";

type Course = {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  level: "kana" | "n5" | "n4" | "n3" | "n2" | "n1" | "it" | "custom";
  sourceType: "system" | "user" | "ai";
  visibility: "private" | "public" | "unlisted";
  status: "draft" | "pending_review" | "published" | "rejected" | "hidden" | "archived";
  languagePair?: {
    source?: string;
    target?: string;
  };
  price?: {
    amount?: number;
    currency?: string;
  };
  stats?: {
    vocabularyCount?: number;
    learnerCount?: number;
  };
  tags?: string[];
  ownerId?: {
    _id?: string;
    username?: string;
    email?: string;
    displayName?: string;
  } | string;
};

type Meta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type CourseFormState = {
  id?: string;
  title: string;
  slug: string;
  description: string;
  level: Course["level"];
  sourceType: Course["sourceType"];
  visibility: Course["visibility"];
  status: Course["status"];
  sourceLanguage: string;
  targetLanguage: string;
  priceAmount: string;
  priceCurrency: string;
  tags: string;
};

type CourseDetail = {
  course: Course;
  lessonStats: Array<{ lesson: number | string; count: number; published: number }>;
  recentVocabulary: Array<{
    _id: string;
    term: string;
    kana?: string;
    romaji?: string;
    meaningVi: string;
    lesson?: number;
    isPublished?: boolean;
    examples?: Array<{ ja?: string; vi?: string }>;
  }>;
};

const emptyForm: CourseFormState = {
  title: "",
  slug: "",
  description: "",
  level: "custom",
  sourceType: "system",
  visibility: "private",
  status: "draft",
  sourceLanguage: "ja",
  targetLanguage: "vi",
  priceAmount: "0",
  priceCurrency: "VND",
  tags: "",
};

const levelOptions = [
  ["Tất cả cấp độ", "all"],
  ["Kana", "kana"],
  ["N5", "n5"],
  ["N4", "n4"],
  ["N3", "n3"],
  ["N2", "n2"],
  ["N1", "n1"],
  ["IT", "it"],
  ["Custom", "custom"],
] as const;

const sourceTypeOptions = [
  ["Tất cả loại", "all"],
  ["Hệ thống", "system"],
  ["User tạo", "user"],
  ["AI tạo", "ai"],
] as const;

const visibilityOptions = [
  ["Tất cả hiển thị", "all"],
  ["Private", "private"],
  ["Public", "public"],
  ["Unlisted", "unlisted"],
] as const;

const statusOptions = [
  ["Tất cả trạng thái", "all"],
  ["Draft", "draft"],
  ["Pending review", "pending_review"],
  ["Published", "published"],
  ["Rejected", "rejected"],
  ["Hidden", "hidden"],
  ["Archived", "archived"],
] as const;

export function AdminCoursesClient({ courses, meta }: Readonly<{ courses: Course[]; meta: Meta }>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<CourseFormState>(emptyForm);
  const [detail, setDetail] = useState<CourseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const queryState = useMemo(
    () => ({
      q: searchParams.get("q") || "",
      level: searchParams.get("level") || "all",
      sourceType: searchParams.get("sourceType") || "all",
      visibility: searchParams.get("visibility") || "all",
      status: searchParams.get("status") || "all",
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
    router.push(query ? `/admin/courses?${query}` : "/admin/courses");
  }

  function openCreate() {
    setForm(emptyForm);
    setError("");
    setFormOpen(true);
  }

  function openEdit(course: Course) {
    setForm({
      id: course._id,
      title: course.title,
      slug: course.slug,
      description: course.description || "",
      level: course.level,
      sourceType: course.sourceType || "system",
      visibility: course.visibility,
      status: course.status,
      sourceLanguage: course.languagePair?.source || "ja",
      targetLanguage: course.languagePair?.target || "vi",
      priceAmount: String(course.price?.amount ?? 0),
      priceCurrency: course.price?.currency || "VND",
      tags: (course.tags || []).join(", "),
    });
    setError("");
    setFormOpen(true);
  }

  async function submitCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const isEdit = Boolean(form.id);
      const payload = {
        title: form.title,
        slug: form.slug || undefined,
        description: form.description,
        level: form.level,
        sourceType: form.sourceType,
        visibility: form.visibility,
        status: form.status,
        sourceLanguage: form.sourceLanguage,
        targetLanguage: form.targetLanguage,
        priceAmount: Number(form.priceAmount || 0),
        priceCurrency: form.priceCurrency,
        tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      };

      const response = await fetch(isEdit ? `/api/admin/courses/${form.id}` : "/api/admin/courses", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Không thể lưu khóa học.");
        return;
      }

      setFormOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function deleteCourse(course: Course) {
    if (!confirm(`Xóa khóa học "${course.title}"?`)) {
      return;
    }

    const response = await fetch(`/api/admin/courses/${course._id}`, { method: "DELETE" });

    if (!response.ok) {
      const result = await response.json();
      alert(result.message || "Không thể xóa khóa học.");
      return;
    }

    router.refresh();
  }

  async function openDetail(course: Course) {
    setDetailLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/courses/${course._id}`, { cache: "no-store" });
      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Không thể tải chi tiết khóa học.");
        return;
      }

      setDetail(result.data);
    } finally {
      setDetailLoading(false);
    }
  }

  async function quickStatus(course: Course, status: Course["status"], visibility = course.visibility) {
    const response = await fetch(`/api/admin/courses/${course._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, visibility }),
    });
    const result = await response.json();

    if (!response.ok) {
      alert(result.message || "Không thể đổi trạng thái khóa học.");
      return;
    }

    if (detail?.course._id === course._id) {
      setDetail({ ...detail, course: { ...detail.course, status, visibility } });
    }

    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-teal-700">Admin</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Quản lý khóa học</h1>
          <p className="mt-3 max-w-2xl text-slate-500">CRUD khóa học, tìm kiếm, lọc theo loại tạo và phân trang dữ liệu từ MongoDB.</p>
        </div>
        <button
          className="flex h-12 items-center gap-2 rounded-2xl bg-rose-600 px-5 font-black text-white shadow-xl shadow-rose-600/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-rose-700"
          onClick={openCreate}
          type="button"
        >
          <FiPlus /> Tạo khóa học
        </button>
      </div>

      <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/[0.04]">
        <div className="grid gap-3 xl:grid-cols-[1fr_150px_170px_160px_170px_120px]">
          <label className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-teal-400 focus-within:bg-white">
            <FiSearch className="text-slate-400" />
            <input
              className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
              defaultValue={queryState.q}
              onKeyDown={(event) => {
                if (event.key === "Enter") updateQuery({ q: event.currentTarget.value });
              }}
              placeholder="Tìm tên, slug, mô tả, tag..."
            />
          </label>
          <AdminSelect defaultValue={queryState.level} onChange={(value) => updateQuery({ level: value })} options={levelOptions} />
          <AdminSelect defaultValue={queryState.sourceType} onChange={(value) => updateQuery({ sourceType: value })} options={sourceTypeOptions} />
          <AdminSelect defaultValue={queryState.visibility} onChange={(value) => updateQuery({ visibility: value })} options={visibilityOptions} />
          <AdminSelect defaultValue={queryState.status} onChange={(value) => updateQuery({ status: value })} options={statusOptions} />
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
        <div className="hidden grid-cols-[1.35fr_0.7fr_0.8fr_0.85fr_0.8fr_0.8fr_140px] bg-slate-50 px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-500 lg:grid">
          <span>Khóa học</span>
          <span>Cấp độ</span>
          <span>Loại</span>
          <span>Hiển thị</span>
          <span>Trạng thái</span>
          <span>Từ / học viên</span>
          <span className="text-right">Thao tác</span>
        </div>
        {courses.map((course) => (
          <div className="grid gap-3 border-t border-slate-100 px-5 py-4 text-sm transition hover:bg-teal-50/50 lg:grid-cols-[1.35fr_0.7fr_0.8fr_0.85fr_0.8fr_0.8fr_140px] lg:items-center" key={course._id}>
            <div>
              <p className="font-black text-slate-950">{course.title}</p>
              <p className="mt-1 text-xs font-bold text-slate-400">/{course.slug}</p>
              {course.description && <p className="mt-2 line-clamp-1 text-xs font-semibold text-slate-500">{course.description}</p>}
            </div>
            <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase text-slate-700">{course.level}</span>
            <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${sourceTypeTone(course.sourceType)}`}>{sourceTypeLabel(course.sourceType)}</span>
            <span className="font-bold text-slate-600">{visibilityLabel(course.visibility)}</span>
            <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${statusTone(course.status)}`}>{statusLabel(course.status)}</span>
            <div className="text-xs font-bold text-slate-500">
              <p>{course.stats?.vocabularyCount || 0} từ</p>
              <p className="mt-1">{course.stats?.learnerCount || 0} học viên</p>
            </div>
            <div className="flex gap-2 lg:justify-end">
              <button className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-indigo-100 hover:text-indigo-700" onClick={() => openDetail(course)} title="Chi tiết" type="button">
                <FiEye />
              </button>
              <button className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-teal-100 hover:text-teal-700" onClick={() => openEdit(course)} title="Sửa" type="button">
                <FiEdit3 />
              </button>
              <button className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-rose-100 hover:text-rose-700" onClick={() => deleteCourse(course)} title="Xóa" type="button">
                <FiTrash2 />
              </button>
            </div>
          </div>
        ))}
        {courses.length === 0 && (
          <div className="px-5 py-16 text-center">
            <p className="text-lg font-black text-slate-950">Không có khóa học phù hợp</p>
            <p className="mt-2 text-sm text-slate-500">Thử đổi bộ lọc hoặc tạo khóa học mới.</p>
          </div>
        )}
      </section>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-500">
          Tổng {meta.total} khóa học · Trang {meta.page}/{meta.totalPages}
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
          <form className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-[2rem] bg-white p-6 shadow-2xl shadow-slate-950/20" onSubmit={submitCourse}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-rose-600">Course CRUD</p>
                <h2 className="mt-2 text-3xl font-black text-slate-950">{form.id ? "Sửa khóa học" : "Tạo khóa học"}</h2>
              </div>
              <button className="grid h-10 w-10 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-950" onClick={() => setFormOpen(false)} type="button">
                <FiX />
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <AdminInput label="Tên khóa học" onChange={(value) => setForm({ ...form, title: value })} value={form.title} />
              <AdminInput label="Slug" onChange={(value) => setForm({ ...form, slug: value })} placeholder="Tự tạo từ tên nếu bỏ trống" value={form.slug} />
              <label className="sm:col-span-2">
                <span className="mb-2 block text-sm font-black text-slate-700">Mô tả</span>
                <textarea className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none transition focus:border-teal-400" onChange={(event) => setForm({ ...form, description: event.target.value })} value={form.description} />
              </label>
              <FormSelect label="Cấp độ" onChange={(value) => setForm({ ...form, level: value as Course["level"] })} options={levelOptions.slice(1)} value={form.level} />
              <FormSelect label="Loại khóa học" onChange={(value) => setForm({ ...form, sourceType: value as Course["sourceType"] })} options={sourceTypeOptions.slice(1)} value={form.sourceType} />
              <FormSelect label="Hiển thị" onChange={(value) => setForm({ ...form, visibility: value as Course["visibility"] })} options={visibilityOptions.slice(1)} value={form.visibility} />
              <FormSelect label="Trạng thái" onChange={(value) => setForm({ ...form, status: value as Course["status"] })} options={statusOptions.slice(1)} value={form.status} />
              <AdminInput label="Ngôn ngữ nguồn" onChange={(value) => setForm({ ...form, sourceLanguage: value })} value={form.sourceLanguage} />
              <AdminInput label="Ngôn ngữ đích" onChange={(value) => setForm({ ...form, targetLanguage: value })} value={form.targetLanguage} />
              <AdminInput label="Giá" onChange={(value) => setForm({ ...form, priceAmount: value })} type="number" value={form.priceAmount} />
              <AdminInput label="Tiền tệ" onChange={(value) => setForm({ ...form, priceCurrency: value })} value={form.priceCurrency} />
              <AdminInput label="Tags, cách nhau bằng dấu phẩy" onChange={(value) => setForm({ ...form, tags: value })} value={form.tags} />
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

      {detail && (
        <CourseDetailDialog
          detail={detail}
          loading={detailLoading}
          onArchive={() => quickStatus(detail.course, "archived")}
          onClose={() => setDetail(null)}
          onEdit={() => {
            openEdit(detail.course);
            setDetail(null);
          }}
          onHide={() => quickStatus(detail.course, "hidden", "private")}
          onPublish={() => quickStatus(detail.course, "published", "public")}
        />
      )}
    </div>
  );
}

function CourseDetailDialog({
  detail,
  loading,
  onArchive,
  onClose,
  onEdit,
  onHide,
  onPublish,
}: Readonly<{
  detail: CourseDetail;
  loading: boolean;
  onArchive: () => void;
  onClose: () => void;
  onEdit: () => void;
  onHide: () => void;
  onPublish: () => void;
}>) {
  const course = detail.course;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-[2rem] bg-white p-6 shadow-2xl shadow-slate-950/20">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-teal-700">Chi tiết khóa học</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">{course.title}</h2>
            <p className="mt-2 text-sm font-bold text-slate-500">/{course.slug}</p>
          </div>
          <button className="grid h-10 w-10 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-950" onClick={onClose} type="button">
            <FiX />
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <DetailMetric label="Cấp độ" value={course.level.toUpperCase()} />
          <DetailMetric label="Trạng thái" value={statusLabel(course.status)} />
          <DetailMetric label="Từ vựng" value={String(course.stats?.vocabularyCount || 0)} />
          <DetailMetric label="Học viên" value={String(course.stats?.learnerCount || 0)} />
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button className="inline-flex h-11 items-center gap-2 rounded-2xl bg-rose-600 px-4 font-black text-white transition hover:bg-rose-700" onClick={onPublish} type="button">
            <FiUploadCloud /> Publish public
          </button>
          <button className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 px-4 font-black text-slate-700 transition hover:bg-slate-50" onClick={onHide} type="button">
            <FiEyeOff /> Ẩn khóa
          </button>
          <button className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 px-4 font-black text-slate-700 transition hover:bg-slate-50" onClick={onArchive} type="button">
            <FiArchive /> Lưu trữ
          </button>
          <button className="inline-flex h-11 items-center gap-2 rounded-2xl border border-teal-200 bg-teal-50 px-4 font-black text-teal-800 transition hover:bg-teal-100" onClick={onEdit} type="button">
            <FiEdit3 /> Sửa thông tin
          </button>
        </div>

        <section className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[1.5rem] border border-slate-200 p-4">
            <p className="text-sm font-black uppercase tracking-widest text-teal-700">Thống kê theo bài</p>
            <div className="mt-4 grid max-h-80 gap-2 overflow-auto">
              {detail.lessonStats.map((lesson) => (
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold" key={String(lesson.lesson)}>
                  <span>Bài {lesson.lesson}</span>
                  <span>{lesson.count} từ · {lesson.published} public</span>
                </div>
              ))}
              {detail.lessonStats.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">Chưa có từ vựng trong khóa này.</p>}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 p-4">
            <p className="text-sm font-black uppercase tracking-widest text-rose-600">Từ vựng mẫu</p>
            <div className="mt-4 grid max-h-80 gap-2 overflow-auto">
              {detail.recentVocabulary.map((word) => (
                <article className="rounded-2xl bg-slate-50 p-4" key={word._id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-950">{word.term}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">{[word.kana, word.romaji].filter(Boolean).join(" / ")}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-teal-700">Bài {word.lesson || "?"}</span>
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-700">{word.meaningVi}</p>
                  {word.examples?.[0]?.ja && <p className="mt-2 text-sm font-semibold text-slate-500">{word.examples[0].ja}</p>}
                </article>
              ))}
            </div>
          </div>
        </section>

        {loading && <p className="mt-4 text-sm font-bold text-slate-500">Đang tải...</p>}
      </div>
    </div>
  );
}

function DetailMetric({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function AdminSelect({
  defaultValue,
  onChange,
  options,
}: Readonly<{
  defaultValue: string;
  onChange: (value: string) => void;
  options: readonly (readonly [string, string])[];
}>) {
  return (
    <select className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition hover:border-teal-300" defaultValue={defaultValue} onChange={(event) => onChange(event.target.value)}>
      {options.map(([label, value]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}

function FormSelect({
  label,
  onChange,
  options,
  value,
}: Readonly<{
  label: string;
  onChange: (value: string) => void;
  options: readonly (readonly [string, string])[];
  value: string;
}>) {
  return (
    <label>
      <span className="mb-2 block text-sm font-black text-slate-700">{label}</span>
      <select className="h-12 w-full rounded-2xl border border-slate-200 px-4 font-semibold outline-none transition focus:border-teal-400" onChange={(event) => onChange(event.target.value)} value={value}>
        {options.map(([optionLabel, optionValue]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function AdminInput({
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: Readonly<{
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  value: string;
}>) {
  return (
    <label>
      <span className="mb-2 block text-sm font-black text-slate-700">{label}</span>
      <input className="h-12 w-full rounded-2xl border border-slate-200 px-4 font-semibold outline-none transition focus:border-teal-400" onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type={type} value={value} />
    </label>
  );
}

function sourceTypeLabel(type: Course["sourceType"]) {
  return {
    system: "Hệ thống",
    user: "User tạo",
    ai: "AI tạo",
  }[type];
}

function sourceTypeTone(type: Course["sourceType"]) {
  return {
    system: "bg-slate-100 text-slate-700",
    user: "bg-blue-50 text-blue-700",
    ai: "bg-violet-50 text-violet-700",
  }[type];
}

function visibilityLabel(visibility: Course["visibility"]) {
  return {
    private: "Private",
    public: "Public",
    unlisted: "Unlisted",
  }[visibility];
}

function statusLabel(status: Course["status"]) {
  return {
    draft: "Draft",
    pending_review: "Pending",
    published: "Published",
    rejected: "Rejected",
    hidden: "Hidden",
    archived: "Archived",
  }[status];
}

function statusTone(status: Course["status"]) {
  return {
    draft: "bg-slate-100 text-slate-700",
    pending_review: "bg-amber-50 text-amber-700",
    published: "bg-teal-50 text-teal-700",
    rejected: "bg-rose-50 text-rose-700",
    hidden: "bg-orange-50 text-orange-700",
    archived: "bg-zinc-100 text-zinc-700",
  }[status];
}
