import { FiActivity, FiAward, FiCheckCircle, FiZap } from "react-icons/fi";

const dailyXp = 35;
const dailyGoal = 50;
const progress = Math.min((dailyXp / dailyGoal) * 100, 100);
const xpRewards = [10, 10, 15, 15, 20, 20, 25];
const quests = [
  { title: "Hoàn thành 1 phiên ôn tập", xp: 15, progress: "0/1" },
  { title: "Trả lời đúng 10 thẻ", xp: 20, progress: "0/10" },
  { title: "Học 5 từ mới", xp: 15, progress: "0/5" },
];

export function DailyPanel() {
  return (
    <aside className="space-y-5">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/[0.05]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-rose-600">Tiến trình XP</p>
            <h3 className="mt-2 text-2xl font-black text-slate-950">Level 3</h3>
          </div>
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-100 text-2xl text-amber-600">
            <FiZap />
          </div>
        </div>

        <div className="mt-5 rounded-[1.5rem] bg-slate-950 p-4 text-white">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Hôm nay</p>
              <p className="mt-1 text-4xl font-black">{dailyXp} XP</p>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-amber-200">Mục tiêu {dailyGoal} XP</span>
          </div>
          <div className="mt-4 h-3 rounded-full bg-white/10">
            <div className="h-3 rounded-full bg-gradient-to-r from-amber-300 via-lime-300 to-teal-300" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-300">Còn {dailyGoal - dailyXp} XP để hoàn thành mục tiêu ngày.</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-rose-50 p-4">
            <div className="flex items-center gap-2 text-rose-600">
              <FiActivity className="h-5 w-5" />
              <span className="text-sm font-black">Streak</span>
            </div>
            <p className="mt-2 text-2xl font-black text-slate-950">0 ngày</p>
          </div>
          <div className="rounded-2xl bg-teal-50 p-4">
            <div className="flex items-center gap-2 text-teal-700">
              <FiAward className="h-5 w-5" />
              <span className="text-sm font-black">League</span>
            </div>
            <p className="mt-2 text-2xl font-black text-slate-950">Đồng</p>
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/[0.05]">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-black uppercase tracking-widest text-rose-700">Thưởng XP</p>
          <span className="text-xs font-black text-slate-400">7 ngày</span>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {xpRewards.map((xp, index) => (
            <div
              className={`rounded-xl border py-2 text-center text-xs font-black ${
                index === 0 ? "border-rose-300 bg-rose-100 text-rose-700" : "border-amber-200 bg-amber-50 text-amber-700"
              }`}
              key={`${xp}-${index}`}
            >
              +{xp}
            </div>
          ))}
        </div>
        <button className="mt-4 h-11 w-full rounded-2xl bg-rose-700 font-black text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-rose-800" type="button">
          Nhận +10 XP
        </button>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/[0.05]">
        <p className="mb-4 text-sm font-black uppercase tracking-widest text-teal-700">Nhiệm vụ ngày</p>
        {quests.map((quest) => (
          <div className="mb-3 rounded-2xl bg-slate-50 p-3 transition-all duration-300 hover:bg-teal-50" key={quest.title}>
            <div className="flex items-center justify-between gap-3 text-sm font-bold">
              <span className="min-w-0">{quest.title}</span>
              <span className="shrink-0 rounded-full bg-white px-2 py-1 text-xs font-black text-rose-600">+{quest.xp} XP</span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-2 flex-1 rounded-full bg-slate-200" />
              <span className="text-xs font-black text-slate-400">{quest.progress}</span>
            </div>
          </div>
        ))}
        <button className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-teal-200 bg-teal-50 font-black text-teal-800 transition-all duration-300 hover:-translate-y-0.5 hover:bg-teal-100" type="button">
          <FiCheckCircle className="h-5 w-5" /> Bắt đầu kiếm XP
        </button>
      </div>
    </aside>
  );
}
