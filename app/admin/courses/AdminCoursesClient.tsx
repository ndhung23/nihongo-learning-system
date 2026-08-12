"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FiArchive, FiBookOpen, FiEdit3, FiEyeOff, FiHelpCircle, FiLoader, FiPlus, FiSearch, FiTrash2, FiUploadCloud, FiX } from "react-icons/fi";

type Course = {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  level: "kana" | "n5" | "n4" | "n3" | "n2" | "n1" | "university" | "high_school" | "other" | "it" | "custom";
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
  jlptTest?: {
    testId?: string;
    level?: string;
    number?: number;
  };
  ownerId?: {
    _id?: string;
    username?: string;
    email?: string;
    displayName?: string;
  } | string;
  isStatic?: boolean;
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

type VocabularyFormState = {
  id?: string;
  term: string;
  kana: string;
  romaji: string;
  meaningVi: string;
  partOfSpeech: string;
  lesson: string;
  isPublished: boolean;
  examplesText: string;
};

const emptyVocabularyForm: VocabularyFormState = {
  term: "",
  kana: "",
  romaji: "",
  meaningVi: "",
  partOfSpeech: "",
  lesson: "",
  isPublished: true,
  examplesText: "",
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
  ["Trường đại học", "university"],
  ["THPT", "high_school"],
  ["Khác", "other"],
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

export function AdminCoursesClient({ capabilities, courses, initialCreatePreset = "", initialOpenCourseId, listCategory = "", meta }: Readonly<{ capabilities: { create: boolean; update: boolean; delete: boolean }; courses: Course[]; initialCreatePreset?: string; initialOpenCourseId?: string; listCategory?: string; meta: Meta }>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formOpen, setFormOpen] = useState(Boolean(initialCreatePreset));
  const [form, setForm] = useState<CourseFormState>(() => createFormForPreset(initialCreatePreset));
  const [selectedCreatePreset, setSelectedCreatePreset] = useState(initialCreatePreset);
  const [detail, setDetail] = useState<CourseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const autoOpenedCourse = useRef(false);

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

  useEffect(() => {
    if (autoOpenedCourse.current) return;
    const course = courses.find((item) => item._id === initialOpenCourseId);
    if (!course) return;
    autoOpenedCourse.current = true;
    void openDetail(course);
  }, [courses, initialOpenCourseId]);

  useEffect(() => {
    if (!initialCreatePreset) return;
    setSelectedCreatePreset(initialCreatePreset);
    setForm(createFormForPreset(initialCreatePreset));
    setError("");
    setFormOpen(true);
  }, [initialCreatePreset]);

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
    if (listCategory === "test") {
      router.push("/admin/jlpt-tests");
      return;
    }

    const preset = listCategory || "course";
    setSelectedCreatePreset(preset);
    setForm(createFormForPreset(preset));
    setError("");
    setFormOpen(true);
  }

  function openEdit(course: Course) {
    setSelectedCreatePreset("");
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

  function closeForm() {
    setFormOpen(false);

    if (searchParams.has("create")) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("create");
      const query = params.toString();
      router.replace(query ? `/admin/courses?${query}` : "/admin/courses");
    }
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

      closeForm();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function deleteCourse(course: Course) {
    if (!confirm(`Xóa khóa học "${course.title}"?`)) {
      return false;
    }

    const response = await fetch(`/api/admin/courses/${course._id}`, { method: "DELETE" });

    if (!response.ok) {
      const result = await response.json();
      alert(result.message || "Không thể xóa khóa học.");
      return false;
    }

    router.refresh();
    return true;
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
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">{listCategory ? categoryListLabel(listCategory) : "Quản lý khóa học"}</h1>
          <p className="mt-3 max-w-2xl text-slate-500">CRUD khóa học, tìm kiếm, lọc theo loại tạo và phân trang dữ liệu từ MongoDB.</p>
        </div>
        {capabilities.create && <button
          className="flex h-12 items-center gap-2 rounded-2xl bg-rose-600 px-5 font-black text-white shadow-xl shadow-rose-600/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-rose-700"
          onClick={openCreate}
          type="button"
        >
          <FiPlus /> {listCategory === "test" ? "Tạo đề thi" : "Tạo khóa học"}
        </button>}
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
              {course.isStatic ? (
                <a className="flex h-9 items-center gap-1 rounded-xl bg-teal-50 px-3 text-xs font-black text-teal-700 transition hover:bg-teal-100" href={`/flashcards/kana/${course.slug}`} title="Xem khóa học">
                  <FiBookOpen /> Xem
                </a>
              ) : course.jlptTest?.testId ? (
                <a className="flex h-9 items-center gap-1 rounded-xl bg-indigo-50 px-3 text-xs font-black text-indigo-700 transition hover:bg-indigo-100" href={`/admin/jlpt-tests?edit=${course.jlptTest.testId}`} title="Mở trình soạn đề thi">
                  <FiBookOpen /> Từ vựng
                </a>
              ) : <button className="flex h-9 items-center gap-1 rounded-xl bg-indigo-50 px-3 text-xs font-black text-indigo-700 transition hover:bg-indigo-100" onClick={() => openDetail(course)} title="Quản lý từ vựng" type="button">
                  <FiBookOpen /> Từ vựng
                </button>}
              {capabilities.update && !course.isStatic && <button className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-teal-100 hover:text-teal-700" onClick={() => openEdit(course)} title="Sửa" type="button">
                <FiEdit3 />
              </button>}
              {capabilities.delete && !course.isStatic && <button className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-rose-100 hover:text-rose-700" onClick={() => deleteCourse(course)} title="Xóa" type="button">
                <FiTrash2 />
              </button>}
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
                <h2 className="mt-2 text-3xl font-black text-slate-950">{form.id ? "Sửa khóa học" : createPresetLabel(selectedCreatePreset)}</h2>
              </div>
              <button className="grid h-10 w-10 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-950" onClick={closeForm} type="button">
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
              <button className="h-12 rounded-2xl border border-slate-200 px-5 font-black text-slate-600 transition hover:bg-slate-50" onClick={closeForm} type="button">
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
          onDelete={async () => {
            if (await deleteCourse(detail.course)) setDetail(null);
          }}
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
  onDelete,
  onEdit,
  onHide,
  onPublish,
}: Readonly<{
  detail: CourseDetail;
  loading: boolean;
  onArchive: () => void;
  onClose: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onHide: () => void;
  onPublish: () => void;
}>) {
  const course = detail.course;
  const [vocabulary, setVocabulary] = useState(detail.recentVocabulary);
  const [vocabularyForm, setVocabularyForm] = useState<VocabularyFormState>(emptyVocabularyForm);
  const [importText, setImportText] = useState("");
  const [vocabularyError, setVocabularyError] = useState("");
  const [vocabularySaving, setVocabularySaving] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<string>("all");
  const [vocabularyLoading, setVocabularyLoading] = useState(false);
  const [showImportHint, setShowImportHint] = useState(false);

  function editVocabulary(word: CourseDetail["recentVocabulary"][number]) {
    setVocabularyForm({
      id: word._id,
      term: word.term,
      kana: word.kana || "",
      romaji: word.romaji || "",
      meaningVi: word.meaningVi,
      partOfSpeech: "",
      lesson: word.lesson ? String(word.lesson) : "",
      isPublished: Boolean(word.isPublished),
      examplesText: (word.examples || []).map((example) => [example.ja, example.vi].filter(Boolean).join(" | ")).join("\n"),
    });
    setVocabularyError("");
  }

  async function saveVocabulary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setVocabularySaving(true);
    setVocabularyError("");

    try {
      const payload = buildVocabularyPayload(vocabularyForm);
      const isEdit = Boolean(vocabularyForm.id);
      const response = await fetch(
        isEdit ? `/api/admin/courses/${course._id}/vocabulary/${vocabularyForm.id}` : `/api/admin/courses/${course._id}/vocabulary`,
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = await response.json();

      if (!response.ok) {
        setVocabularyError(result.message || "Không thể lưu từ vựng.");
        return;
      }

      setVocabulary((current) => {
        if (isEdit) {
          return current.map((word) => (word._id === result.data._id ? result.data : word));
        }

        return [result.data, ...current].slice(0, 80);
      });
      setVocabularyForm({ ...emptyVocabularyForm, lesson: selectedLesson === "all" ? "" : selectedLesson });
    } finally {
      setVocabularySaving(false);
    }
  }

  async function deleteVocabulary(wordId: string) {
    if (!confirm("Xóa từ vựng này?")) {
      return;
    }

    const response = await fetch(`/api/admin/courses/${course._id}/vocabulary/${wordId}`, { method: "DELETE" });
    const result = await response.json();

    if (!response.ok) {
      setVocabularyError(result.message || "Không thể xóa từ vựng.");
      return;
    }

    setVocabulary((current) => current.filter((word) => word._id !== wordId));
  }

  async function loadVocabulary(lesson: string) {
    setSelectedLesson(lesson);
    setVocabularyLoading(true);
    setVocabularyError("");
    try {
      const query = new URLSearchParams({ limit: "200" });
      if (lesson !== "all") query.set("lesson", lesson);
      const response = await fetch(`/api/admin/courses/${course._id}/vocabulary?${query}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) {
        setVocabularyError(result.message || "Không thể tải từ vựng của bài.");
        return;
      }
      setVocabulary(result.data || []);
      setVocabularyForm((current) => ({ ...current, lesson: lesson === "all" ? current.lesson : lesson }));
    } finally {
      setVocabularyLoading(false);
    }
  }

  async function importVocabulary() {
    setVocabularySaving(true);
    setVocabularyError("");

    try {
      const response = await fetch(`/api/admin/courses/${course._id}/vocabulary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importText, level: course.level === "it" ? "custom" : course.level, isPublished: true }),
      });
      const result = await response.json();

      if (!response.ok) {
        setVocabularyError(result.message || "Không thể import từ vựng.");
        return;
      }

      setImportText("");
      const refreshQuery = new URLSearchParams({ limit: "200" });
      if (selectedLesson !== "all") refreshQuery.set("lesson", selectedLesson);
      const refresh = await fetch(`/api/admin/courses/${course._id}/vocabulary?${refreshQuery}`, { cache: "no-store" });
      const refreshResult = await refresh.json();

      if (refresh.ok) {
        setVocabulary(refreshResult.data || []);
      }

      setVocabularyError(`Đã import ${result.data.imported} dòng.`);
    } finally {
      setVocabularySaving(false);
    }
  }

  async function selectImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setVocabularyError("File import không được lớn hơn 5 MB.");
      return;
    }
    try {
      setImportText(await file.text());
      setVocabularyError(`Đã đọc file “${file.name}”. Kiểm tra nội dung rồi bấm Import.`);
    } catch {
      setVocabularyError("Không thể đọc file này.");
    }
  }

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
          {course.sourceType === "user" && (course.tags || []).includes("personal") ? <a className="inline-flex h-11 items-center gap-2 rounded-2xl bg-slate-950 px-4 font-black text-white transition hover:bg-teal-700" href={`/flashcards/my-vocabulary?deckId=${course._id}`}><FiBookOpen /> Chế độ sửa</a> : null}
          <button className="inline-flex h-11 items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 font-black text-rose-700 transition hover:bg-rose-100" onClick={onDelete} type="button">
            <FiTrash2 /> Xóa khóa
          </button>
        </div>

        <section className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[1.5rem] border border-slate-200 p-4">
            <p className="text-sm font-black uppercase tracking-widest text-teal-700">Thống kê theo bài</p>
            <div className="mt-4 grid max-h-80 gap-2 overflow-auto">
              <button
                className={`flex items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${selectedLesson === "all" ? "bg-teal-700 text-white" : "bg-slate-50 hover:bg-teal-50"}`}
                onClick={() => loadVocabulary("all")}
                type="button"
              >
                <span>Tất cả bài</span>
                <span>{course.stats?.vocabularyCount || 0} từ</span>
              </button>
              {detail.lessonStats.map((lesson) => (
                <button
                  className={`flex items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${selectedLesson === String(lesson.lesson) ? "bg-teal-700 text-white shadow" : "bg-slate-50 hover:bg-teal-50"}`}
                  key={String(lesson.lesson)}
                  onClick={() => loadVocabulary(String(lesson.lesson))}
                  type="button"
                >
                  <span>Bài {lesson.lesson}</span>
                  <span>{lesson.count} từ · {lesson.published} public</span>
                </button>
              ))}
              {detail.lessonStats.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">Chưa có từ vựng trong khóa này.</p>}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-black uppercase tracking-widest text-rose-600">CRUD từ vựng</p>
              <button className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700" onClick={() => setVocabularyForm({ ...emptyVocabularyForm, lesson: selectedLesson === "all" ? "" : selectedLesson })} type="button">
                Tạo mới
              </button>
            </div>

            <form className="mt-4 grid gap-3" onSubmit={saveVocabulary}>
              <div className="grid gap-3 md:grid-cols-2">
                <MiniInput label="Hán/Kanji" onChange={(value) => setVocabularyForm({ ...vocabularyForm, term: value })} value={vocabularyForm.term} />
                <MiniInput label="Kana" onChange={(value) => setVocabularyForm({ ...vocabularyForm, kana: value })} value={vocabularyForm.kana} />
                <MiniInput label="Romaji" onChange={(value) => setVocabularyForm({ ...vocabularyForm, romaji: value })} value={vocabularyForm.romaji} />
                <MiniInput label="Tiếng Việt" onChange={(value) => setVocabularyForm({ ...vocabularyForm, meaningVi: value })} value={vocabularyForm.meaningVi} />
                <MiniInput label="Bài" onChange={(value) => setVocabularyForm({ ...vocabularyForm, lesson: value })} type="number" value={vocabularyForm.lesson} />
                <label className="flex items-center gap-2 pt-6 text-sm font-black text-slate-700">
                  <input checked={vocabularyForm.isPublished} onChange={(event) => setVocabularyForm({ ...vocabularyForm, isPublished: event.target.checked })} type="checkbox" />
                  Public
                </label>
              </div>
              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">Ví dụ, mỗi dòng: câu Nhật | nghĩa Việt</span>
                <textarea
                  className="min-h-20 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition focus:border-teal-400"
                  onChange={(event) => setVocabularyForm({ ...vocabularyForm, examplesText: event.target.value })}
                  placeholder="何でも食べます | Tôi ăn gì cũng được"
                  value={vocabularyForm.examplesText}
                />
              </label>
              <button className="h-11 rounded-2xl bg-teal-700 font-black text-white transition hover:bg-teal-800 disabled:opacity-60" disabled={vocabularySaving} type="submit">
                {vocabularySaving ? "Đang lưu..." : vocabularyForm.id ? "Lưu từ vựng" : "Thêm từ vào khóa"}
              </button>
            </form>

            <div className="mt-5 rounded-2xl bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">Import / Copy paste</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Hỗ trợ TXT, CSV hoặc JSON; xử lý trực tiếp, không dùng AI.</p>
                </div>
                <label className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-teal-700 hover:bg-teal-50">
                  <FiUploadCloud className="mr-1 inline" /> Chọn file
                  <input accept=".txt,.csv,.json,text/plain,text/csv,application/json" className="hidden" onChange={selectImportFile} type="file" />
                </label>
              </div>
              <button
                className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-teal-200 bg-white text-xs font-black text-teal-800 hover:bg-teal-50"
                onClick={() => setShowImportHint((current) => !current)}
                type="button"
              >
                <FiHelpCircle /> Hướng dẫn Format Import từ vựng
              </button>
              {showImportHint ? <VocabularyImportHint onClose={() => setShowImportHint(false)} /> : null}
              <textarea
                className="mt-3 min-h-36 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm font-semibold outline-none transition focus:border-rose-400"
                onChange={(event) => setImportText(event.target.value)}
                placeholder={'CSV: term,kana,romaji,meaningVi,example,lesson\n何でも,なんでも,nandemo,cái gì cũng,何でも食べます,1\n\nJSON: {"words":[{"term":"何でも","kana":"なんでも","meaningVi":"cái gì cũng"}]}'}
                value={importText}
              />
              <button className="mt-2 h-10 w-full rounded-xl bg-rose-600 text-sm font-black text-white transition hover:bg-rose-700 disabled:opacity-60" disabled={vocabularySaving || !importText.trim()} onClick={importVocabulary} type="button">
                Import vào khóa học
              </button>
            </div>

            {vocabularyError && <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">{vocabularyError}</p>}

            <div className="mt-4 grid max-h-80 gap-2 overflow-auto">
              {vocabularyLoading ? <p className="flex items-center justify-center gap-2 rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-500"><FiLoader className="animate-spin" /> Đang tải bài {selectedLesson === "all" ? "tất cả" : selectedLesson}...</p> : null}
              {vocabulary.map((word) => (
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
                  <div className="mt-3 flex gap-2">
                    <button className="rounded-xl bg-white px-3 py-2 text-xs font-black text-teal-700 transition hover:bg-teal-50" onClick={() => editVocabulary(word)} type="button">
                      Sửa
                    </button>
                    <button className="rounded-xl bg-white px-3 py-2 text-xs font-black text-rose-700 transition hover:bg-rose-50" onClick={() => deleteVocabulary(word._id)} type="button">
                      Xóa
                    </button>
                  </div>
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

function VocabularyImportHint({ onClose }: { onClose: () => void }) {
  return (
    <div className="mt-3 rounded-xl border border-teal-200 bg-white p-4 text-sm text-slate-700">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-black text-slate-900">Format Import từ vựng</h4>
          <p className="mt-1 text-xs text-slate-500">Copy–paste hoặc chọn file UTF-8. JSON/CSV được xử lý trực tiếp, không dùng AI.</p>
        </div>
        <button aria-label="Đóng hướng dẫn" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 hover:bg-rose-100" onClick={onClose} type="button"><FiX /></button>
      </div>
      <div className="mt-3 grid gap-3">
        <ImportExample title="TXT — một từ mỗi dòng">
          {`何でも|なんでも|nandemo|cái gì cũng|何でも食べます`}
        </ImportExample>
        <ImportExample title="CSV — có dòng tiêu đề">
          {`term,kana,romaji,meaningVi,example,lesson
何でも,なんでも,nandemo,cái gì cũng,何でも食べます,1`}
        </ImportExample>
        <ImportExample title="JSON">
          {`{
  "words": [{
    "term": "何でも",
    "kana": "なんでも",
    "romaji": "nandemo",
    "meaningVi": "cái gì cũng",
    "lesson": 1,
    "examples": [{"ja": "何でも食べます", "vi": "Tôi ăn gì cũng được"}]
  }]
}`}
        </ImportExample>
      </div>
      <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">Nếu đang chọn một bài, danh sách sau Import chỉ hiển thị từ thuộc bài đó. Từ trùng Kanji trong cùng khóa sẽ được cập nhật.</p>
    </div>
  );
}

function ImportExample({ children, title }: { children: string; title: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-slate-50 p-3">
      <p className="mb-2 text-xs font-black text-slate-900">{title}</p>
      <pre className="overflow-x-auto whitespace-pre text-xs leading-5">{children}</pre>
    </div>
  );
}

function buildVocabularyPayload(form: VocabularyFormState) {
  return {
    term: form.term,
    kana: form.kana || undefined,
    romaji: form.romaji || undefined,
    meaningVi: form.meaningVi,
    partOfSpeech: form.partOfSpeech || undefined,
    lesson: form.lesson ? Number(form.lesson) : undefined,
    isPublished: form.isPublished,
    examples: form.examplesText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [ja, vi] = line.includes("|") ? line.split("|") : line.split(",");
        return { ja: ja?.trim() || "", vi: vi?.trim() || undefined };
      })
      .filter((example) => example.ja),
  };
}

function MiniInput({
  label,
  onChange,
  type = "text",
  value,
}: Readonly<{
  label: string;
  onChange: (value: string) => void;
  type?: string;
  value: string;
}>) {
  return (
    <label>
      <span className="mb-1 block text-xs font-black uppercase tracking-widest text-slate-500">{label}</span>
      <input className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none transition focus:border-teal-400" onChange={(event) => onChange(event.target.value)} type={type} value={value} />
    </label>
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

function createFormForPreset(preset: string): CourseFormState {
  const presetTags: Record<string, string> = {
    basic: "Cơ bản",
    flashcard: "Flashcard",
    kanji: "Kanji, Luyện viết Kanji",
    roadmap: "roadmap",
  };

  return {
    ...emptyForm,
    tags: presetTags[preset] || "",
  };
}

function createPresetLabel(preset: string) {
  return {
    course: "Tạo khóa học thông thường",
    basic: "Tạo khóa học cơ bản",
    kanji: "Tạo khóa luyện viết Kanji",
    flashcard: "Tạo bộ Flashcard",
    roadmap: "Tạo lộ trình học",
  }[preset] || "Tạo khóa học";
}

function categoryListLabel(category: string) {
  return {
    basic: "Khóa học cơ bản",
    kanji: "Khóa luyện viết Kanji",
    flashcard: "Danh sách Flashcard",
    roadmap: "Lộ trình học",
    test: "Danh sách đề thi",
  }[category] || "Quản lý khóa học";
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
