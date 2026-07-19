"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FiChevronDown,
  FiLogIn,
  FiLogOut,
  FiMail,
  FiMoon,
  FiSearch,
  FiSend,
  FiShield,
  FiSun,
  FiUser,
  FiX,
} from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import { announceDailyProgressOwner } from "./dailyProgressStorage";

type CurrentUser = {
  userId?: string;
  id?: string;
  username: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  roles: string[];
  permissions?: string[];
  aiCredits?: number;
};

type PublicFeedback = {
  id: string;
  message: string;
};

const supportEmail = "nhatngu430@gmail.com";
const supportQrUrl = "/support-qr.png";

export function Topbar({
  theme,
  onToggleTheme,
}: Readonly<{
  theme: "light" | "dark";
  onToggleTheme: () => void;
}>) {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [feedbackError, setFeedbackError] = useState("");
  const [feedbackItems, setFeedbackItems] = useState<PublicFeedback[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadMe = useCallback(async () => {
    const response = await fetch("/api/auth/me", { cache: "no-store" });

    if (!response.ok) {
      setUser(null);
      announceDailyProgressOwner(null);
      return;
    }

    const payload = (await response.json()) as { user: CurrentUser };
    setUser(payload.user);
    announceDailyProgressOwner(payload.user.userId || payload.user.id, payload.user.aiCredits);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadMe();
  }, [loadMe]);

  const loadFeedback = useCallback(async () => {
    setFeedbackLoading(true);

    try {
      const response = await fetch("/api/feedback", { cache: "no-store" });
      const payload = (await response.json()) as { data?: PublicFeedback[]; message?: string };

      if (!response.ok) {
        throw new Error(payload.message || "Không thể tải feedback.");
      }

      setFeedbackItems(payload.data || []);
    } catch (error) {
      setFeedbackError(error instanceof Error ? error.message : "Không thể tải feedback.");
    } finally {
      setFeedbackLoading(false);
    }
  }, []);

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
      const payload = (await response.json()) as { user: CurrentUser; message?: string };

      if (!response.ok) {
        setError(payload.message || "Không thể đăng nhập.");
        return;
      }

      setUser(payload.user);
      announceDailyProgressOwner(payload.user.userId || payload.user.id, payload.user.aiCredits);
      setLoginOpen(false);
      setMenuOpen(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    announceDailyProgressOwner(null);
    setMenuOpen(false);
  }

  async function handleFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedbackStatus("sending");
    setFeedbackError("");

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: feedbackText,
          page: window.location.pathname,
        }),
      });
      const payload = (await response.json()) as { data?: PublicFeedback; message?: string };

      if (!response.ok) {
        throw new Error(payload.message || "Không thể gửi góp ý.");
      }

      setFeedbackText("");
      setFeedbackStatus("sent");
      if (payload.data) {
        setFeedbackItems((items) => [payload.data as PublicFeedback, ...items]);
      }
    } catch (error) {
      setFeedbackError(error instanceof Error ? error.message : "Không thể gửi góp ý.");
      setFeedbackStatus("error");
    }
  }

  function handleCourseSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchQuery.trim();
    const params = new URLSearchParams();

    params.set("type", "all");

    if (query) {
      params.set("q", query);
    }

    router.push(`/flashcards/discover?${params.toString()}`);
  }

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[#fbfaf5]/88 backdrop-blur-2xl transition-colors duration-300 dark:border-slate-800 dark:bg-slate-950/88">
        <div className="mx-auto flex h-20 max-w-[1500px] items-center gap-4 px-4 sm:px-6 lg:px-10">
          <form
            className="group hidden h-12 w-full max-w-xl items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm transition-all duration-300 focus-within:border-teal-400 focus-within:shadow-lg focus-within:shadow-teal-500/10 dark:border-slate-700 dark:bg-slate-900 md:flex"
            onSubmit={handleCourseSearch}
          >
            <FiSearch className="text-slate-400 transition group-focus-within:text-teal-600" />
            <input
              className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-slate-400"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Tìm tên khóa học..."
              value={searchQuery}
            />
          </form>

          <nav className="hidden items-center gap-1 xl:flex">
            <HeaderLink exact href="/flashcards" label="Trang chủ" />
            <HeaderLink href="/flashcards/discover" label="Khám phá" />
            <HeaderLink href="/flashcards/bookmarks" label="Bookmark của tôi" />
            <HeaderLink href="/flashcards/my-vocabulary" label="Từ vựng riêng tôi" />
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button className="h-10 rounded-full border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition-all duration-300 hover:-translate-y-0.5 hover:border-teal-300 hover:text-teal-700 hover:shadow-lg hover:shadow-teal-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" type="button">
              VI <FiChevronDown className="ml-1 inline" />
            </button>
            <button
              aria-label={theme === "dark" ? "Đổi sang giao diện sáng" : "Đổi sang giao diện tối"}
              className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 transition-all duration-300 hover:-translate-y-0.5 hover:text-amber-600 hover:shadow-lg hover:shadow-amber-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              onClick={onToggleTheme}
              type="button"
            >
              {theme === "dark" ? <FiSun /> : <FiMoon />}
            </button>
            <button
              aria-label="Gửi góp ý"
              className="relative grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 transition-all duration-300 hover:-translate-y-0.5 hover:text-rose-600 hover:shadow-lg hover:shadow-rose-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              onClick={() => {
                setFeedbackOpen(true);
                setFeedbackStatus("idle");
                setFeedbackError("");
                void loadFeedback();
              }}
              type="button"
            >
              <FiMail />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-teal-500" />
            </button>

            {user ? (
              <div className="relative">
                <button
                  className="flex h-11 items-center gap-3 rounded-full bg-teal-700 pl-2 pr-4 text-sm font-black text-white ring-4 ring-teal-100 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-teal-600/20"
                  onClick={() => setMenuOpen((value) => !value)}
                  type="button"
                >
                  <UserAvatar avatarUrl={user.avatarUrl} name={user.displayName || user.username} sizeClassName="h-8 w-8" />
                  <span className="hidden sm:inline">{user.username}</span>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-14 w-72 rounded-3xl border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-900/12">
                    <div className="flex gap-3 rounded-2xl bg-slate-50 p-4">
                      <UserAvatar avatarUrl={user.avatarUrl} name={user.displayName || user.username} sizeClassName="h-12 w-12" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-black text-slate-950">{user.displayName || user.username}</p>
                        <p className="mt-1 truncate text-sm text-slate-500">{user.email}</p>
                        <p className="mt-1 text-xs font-bold text-slate-400">@{user.username}</p>
                      </div>
                    </div>
                    <div className="px-4 pt-3">
                      <div className="mt-3 flex flex-wrap gap-2">
                        {user.roles.map((role) => (
                          <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-black text-teal-700" key={role}>
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Link className="mt-2 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-bold text-slate-600 transition hover:bg-slate-50 hover:text-teal-700" href="/profile">
                      <FiUser /> Hồ sơ cá nhân
                    </Link>
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

      {feedbackOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-2 sm:p-4 backdrop-blur-sm">
          <form
            className="relative grid max-h-[calc(100vh-1rem)] w-full max-w-7xl overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-slate-950/20 lg:grid-cols-[minmax(0,1fr)_340px] sm:max-h-[calc(100vh-2rem)] dark:bg-slate-900"
            onSubmit={handleFeedback}
          >
            <button
              aria-label="Đóng"
              className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-slate-500 shadow-sm transition hover:bg-slate-100 hover:text-slate-950 lg:right-[356px] dark:bg-slate-900/90 dark:hover:bg-slate-800 dark:hover:text-white"
              onClick={() => setFeedbackOpen(false)}
              type="button"
            >
              <FiX />
            </button>

            <section className="overflow-y-auto p-5 sm:p-8">
              <div className="pr-12">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-teal-700">Ủng hộ & góp ý</p>
                <h2 className="mt-2 text-3xl font-black">Giúp web tốt hơn</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Nếu thấy web hữu ích, mình rất mong nhận được sự ủng hộ để duy trì web. Mọi góp ý cải thiện tính năng, giao diện hoặc nội dung học đều được hiển thị ẩn danh ở bên cạnh.
                </p>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-center dark:border-slate-700 dark:bg-slate-950">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt="QR ủng hộ duy trì web" className="mx-auto aspect-square w-full max-w-[190px] rounded-2xl bg-white p-3 object-contain" src={supportQrUrl} />
                  <p className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-teal-700">Ủng hộ duy trì web</p>
                  <p className="mt-2 break-words text-xs font-bold text-slate-500 dark:text-slate-400">{supportEmail}</p>
                </div>

                <div>
                  <label className="block">
                    <span className="mb-2 block text-sm font-black text-slate-700 dark:text-slate-200">Nội dung feedback</span>
                    <textarea
                      className="min-h-[170px] w-full resize-none rounded-2xl border border-slate-200 bg-white p-4 font-semibold outline-none transition focus:border-teal-400 focus:shadow-lg focus:shadow-teal-500/10 dark:border-slate-700 dark:bg-slate-950"
                      maxLength={2000}
                      onChange={(event) => {
                        setFeedbackText(event.target.value);
                        setFeedbackStatus("idle");
                        setFeedbackError("");
                      }}
                      placeholder="Nhập feedback của bạn..."
                      required
                      value={feedbackText}
                    />
                  </label>
                  {feedbackStatus === "sent" && <p className="mt-3 rounded-2xl bg-teal-50 px-4 py-3 text-sm font-bold text-teal-700">Đã gửi feedback. Cảm ơn bạn!</p>}
                  {feedbackError && <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{feedbackError}</p>}
                  <button
                    className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 font-black text-white shadow-xl shadow-rose-600/20 transition hover:-translate-y-0.5 hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={feedbackStatus === "sending" || feedbackText.trim().length < 5}
                    type="submit"
                  >
                    <FiSend /> {feedbackStatus === "sending" ? "Đang gửi..." : "Gửi"}
                  </button>
                </div>
              </div>
            </section>

            <aside className="flex min-h-[360px] flex-col border-t border-slate-200 bg-slate-50 lg:min-h-0 lg:border-l lg:border-t-0 dark:border-slate-700 dark:bg-slate-950">
              <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
                <p className="font-black text-slate-900 dark:text-white">Feedback ({feedbackItems.length})</p>
                <p className="mt-1 text-xs font-bold text-slate-400">Tất cả feedback đều được ẩn danh</p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                {feedbackLoading && <p className="py-8 text-center text-sm font-bold text-slate-400">Đang tải feedback...</p>}
                {!feedbackLoading && feedbackItems.length === 0 && (
                  <p className="py-8 text-center text-sm font-bold text-slate-400">Chưa có feedback nào.</p>
                )}
                <div className="grid gap-3">
                  {feedbackItems.map((item) => (
                    <article className="flex items-start gap-3" key={item.id}>
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                        <FiUser aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                        <p className="text-sm font-black text-slate-900 dark:text-white">Ẩn danh</p>
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">{item.message}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </aside>
          </form>
        </div>
      )}

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
            <a
              className="mt-3 flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg"
              href="/api/auth/google"
            >
              <FcGoogle className="h-5 w-5" /> {"\u0110\u0103ng nh\u1eadp b\u1eb1ng Google"}
            </a>
            <div className="mt-4 grid grid-cols-1 gap-3 text-sm font-black sm:grid-cols-2">
              <Link
                className="flex h-11 items-center justify-center rounded-2xl border border-teal-200 bg-teal-50 px-4 text-center text-teal-800 transition hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-100 hover:text-teal-900"
                href="/register"
                onClick={() => setLoginOpen(false)}
              >
                Tạo tài khoản
              </Link>
              <Link
                className="flex h-11 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 text-center text-rose-700 transition hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800"
                href="/forgot-password"
                onClick={() => setLoginOpen(false)}
              >
                Quên mật khẩu?
              </Link>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function HeaderLink({
  exact = false,
  href,
  label,
}: Readonly<{ exact?: boolean; href: string; label: string }>) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-black transition ${
        active
          ? "bg-slate-950 text-white shadow-md shadow-slate-950/15 dark:bg-teal-400 dark:text-slate-950"
          : "text-slate-600 hover:bg-white hover:text-teal-700 hover:shadow-sm dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-teal-300"
      }`}
      href={href}
    >
      {label}
    </Link>
  );
}

function UserAvatar({
  avatarUrl,
  name,
  sizeClassName,
}: Readonly<{
  avatarUrl?: string;
  name: string;
  sizeClassName: string;
}>) {
  const [imageFailed, setImageFailed] = useState(false);
  const initial = name.trim().slice(0, 1).toUpperCase() || "U";

  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-white/15 ${sizeClassName}`}>
      {avatarUrl && !imageFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={name} className="h-full w-full object-cover" onError={() => setImageFailed(true)} src={avatarUrl} />
      ) : (
        <span className="font-black">{initial}</span>
      )}
    </span>
  );
}
