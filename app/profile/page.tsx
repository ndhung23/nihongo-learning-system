import Link from "next/link";
import { redirect } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import { AuthError, requireAuth } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage() {
  let session;

  try {
    session = await requireAuth();
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login");
    }

    throw error;
  }

  await connectMongoDB();

  const user = await UserModel.findById(session.userId).select("-passwordHash -passwordReset").lean();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-[#f6f7fb] px-4 py-8 text-slate-950 sm:px-6 lg:px-10">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(225,29,72,0.08),transparent_26%),radial-gradient(circle_at_82%_12%,rgba(20,184,166,0.12),transparent_30%)]" />
      <div className="relative mx-auto max-w-6xl">
        <Link className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-lg shadow-slate-900/5 transition-all duration-300 hover:-translate-y-0.5 hover:border-teal-300 hover:text-teal-700" href="/flashcards">
          <FiArrowLeft /> Về trang chủ
        </Link>

        <header className="mt-8 mb-6">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-teal-700">Tài khoản</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Hồ sơ cá nhân</h1>
          <p className="mt-3 max-w-2xl text-slate-500">Cập nhật thông tin cơ bản, avatar, liên hệ và mật khẩu của bạn.</p>
        </header>

        <ProfileForm
          user={{
            id: String(user._id),
            username: user.username,
            email: user.email,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            roles: user.roles,
            profile: {
              gender: user.profile?.gender || "unknown",
              phone: user.profile?.phone || "",
              birthday: user.profile?.birthday ? user.profile.birthday.toISOString().slice(0, 10) : "",
            },
          }}
        />
      </div>
    </main>
  );
}
