import { FiActivity, FiBookOpen, FiDatabase, FiTrendingUp, FiUsers } from "react-icons/fi";
import { connectMongoDB } from "@/lib/mongodb";
import { DeckModel } from "@/models/Deck";
import { UserModel } from "@/models/User";
import { VocabularyModel } from "@/models/Vocabulary";

export default async function AdminDashboardPage() {
  await connectMongoDB();

  const [userCount, activeUsers, deckCount, vocabularyCount] = await Promise.all([
    UserModel.countDocuments(),
    UserModel.countDocuments({ status: "active" }),
    DeckModel.countDocuments(),
    VocabularyModel.countDocuments(),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-teal-700">Quản trị hệ thống</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Admin Dashboard</h1>
          <p className="mt-3 max-w-2xl text-slate-500">Theo dõi sức khỏe hệ thống, người dùng, bộ từ và nội dung học tập.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 shadow-sm">
          Nihongo Learning System
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetric icon={FiUsers} label="Người dùng" tone="bg-rose-50 text-rose-700" value={userCount} />
        <AdminMetric icon={FiActivity} label="Đang active" tone="bg-teal-50 text-teal-700" value={activeUsers} />
        <AdminMetric icon={FiBookOpen} label="Bộ từ / khóa" tone="bg-indigo-50 text-indigo-700" value={deckCount} />
        <AdminMetric icon={FiDatabase} label="Từ vựng" tone="bg-amber-50 text-amber-700" value={vocabularyCount} />
      </div>

      <section className="mt-8 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/[0.04]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-slate-500">Tăng trưởng học tập</p>
              <h2 className="mt-1 text-2xl font-black">Hoạt động tuần này</h2>
            </div>
            <FiTrendingUp className="h-7 w-7 text-teal-600" />
          </div>
          <div className="mt-8 flex h-56 items-end gap-3">
            {[38, 56, 44, 78, 63, 88, 72].map((height, index) => (
              <div className="flex flex-1 flex-col items-center gap-3" key={index}>
                <div className="w-full rounded-t-2xl bg-gradient-to-t from-teal-500 to-rose-400 shadow-lg shadow-teal-500/10" style={{ height: `${height}%` }} />
                <span className="text-xs font-black text-slate-400">T{index + 2}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-xl shadow-slate-900/10">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-teal-300">Việc cần làm</p>
          <h2 className="mt-3 text-2xl font-black">Ưu tiên quản trị</h2>
          <div className="mt-6 space-y-3">
            {["Duyệt creator mới", "Kiểm tra báo cáo khóa học", "Cập nhật bộ từ N5", "Rà soát feedback"].map((task, index) => (
              <div className="flex items-center justify-between rounded-2xl bg-white/8 px-4 py-3" key={task}>
                <span className="font-bold text-slate-200">{task}</span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-teal-200">#{index + 1}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function AdminMetric({
  icon: Icon,
  label,
  tone,
  value,
}: Readonly<{
  icon: typeof FiUsers;
  label: string;
  tone: string;
  value: number;
}>) {
  return (
    <div className="group rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/[0.04] transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-teal-500/10">
      <div className="flex items-start justify-between">
        <span className={`grid h-12 w-12 place-items-center rounded-2xl ${tone}`}>
          <Icon className="h-6 w-6" />
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">Live</span>
      </div>
      <p className="mt-6 text-4xl font-black">{value}</p>
      <p className="mt-2 text-sm font-bold text-slate-500">{label}</p>
    </div>
  );
}
