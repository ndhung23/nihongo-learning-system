"use client";

import { useEffect, useMemo, useState } from "react";
import { FiActivity, FiAward, FiCheckCircle, FiGift, FiZap } from "react-icons/fi";

const storageKey = "nihongo-daily-progress";
const dailyGoal = 50;
const xpRewards = [10, 10, 15, 15, 20, 20, 25];

type DailyState = {
  date: string;
  totalXp: number;
  dailyXp: number;
  streak: number;
  checkedIn: boolean;
  sessions: number;
  correctAnswers: number;
  newWords: number;
  claimedQuests: string[];
};

const workingQuests = [
  { id: "session", title: "Hoàn thành 1 phiên ôn tập", xp: 15, target: 1, field: "sessions" },
  { id: "correct", title: "Trả lời đúng 10 thẻ", xp: 20, target: 10, field: "correctAnswers" },
  { id: "newWords", title: "Học 5 từ mới", xp: 15, target: 5, field: "newWords" },
] as const;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function createDailyState(): DailyState {
  return {
    date: todayKey(),
    totalXp: 0,
    dailyXp: 0,
    streak: 0,
    checkedIn: false,
    sessions: 0,
    correctAnswers: 0,
    newWords: 0,
    claimedQuests: [],
  };
}

function readDailyState() {
  if (typeof window === "undefined") {
    return createDailyState();
  }

  const fallback = createDailyState();
  const raw = window.localStorage.getItem(storageKey);

  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as DailyState;

    if (parsed.date !== todayKey()) {
      return {
        ...fallback,
        totalXp: parsed.totalXp || 0,
        streak: parsed.streak || 0,
      };
    }

    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

function saveDailyState(nextState: DailyState) {
  window.localStorage.setItem(storageKey, JSON.stringify(nextState));
  window.dispatchEvent(new CustomEvent("nihongo-daily-progress-updated"));
}

export function DailyPanel() {
  const [dailyState, setDailyState] = useState<DailyState>(createDailyState);
  const dailyXp = dailyState.dailyXp;
  const progress = Math.min((dailyXp / dailyGoal) * 100, 100);
  const level = Math.floor(Math.sqrt(dailyState.totalXp / 80)) + 1;
  const nextLevelXp = Math.pow(level, 2) * 80;
  const levelProgress = Math.min((dailyState.totalXp / nextLevelXp) * 100, 100);
  const readyQuestCount = useMemo(
    () =>
      workingQuests.filter((quest) => {
        const value = dailyState[quest.field] as number;
        return value >= quest.target && !dailyState.claimedQuests.includes(quest.id);
      }).length,
    [dailyState],
  );

  useEffect(() => {
    function syncProgress() {
      setDailyState(readDailyState());
    }

    syncProgress();
    window.addEventListener("storage", syncProgress);
    window.addEventListener("nihongo-daily-progress-updated", syncProgress);

    return () => {
      window.removeEventListener("storage", syncProgress);
      window.removeEventListener("nihongo-daily-progress-updated", syncProgress);
    };
  }, []);

  function checkIn() {
    if (dailyState.checkedIn) {
      return;
    }

    const nextState = {
      ...dailyState,
      checkedIn: true,
      streak: dailyState.streak + 1,
      dailyXp: dailyState.dailyXp + 10,
      totalXp: dailyState.totalXp + 10,
    };

    setDailyState(nextState);
    saveDailyState(nextState);
  }

  function claimQuest(questId: string, xp: number) {
    if (dailyState.claimedQuests.includes(questId)) {
      return;
    }

    const nextState = {
      ...dailyState,
      claimedQuests: [...dailyState.claimedQuests, questId],
      dailyXp: dailyState.dailyXp + xp,
      totalXp: dailyState.totalXp + xp,
    };

    setDailyState(nextState);
    saveDailyState(nextState);
  }

  return (
    <aside className="space-y-5">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/[0.05]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-rose-600">Tiến trình XP</p>
            <h3 className="mt-2 text-2xl font-black text-slate-950">Level {level}</h3>
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
          <p className="mt-3 text-sm font-semibold text-slate-300">Còn {Math.max(dailyGoal - dailyXp, 0)} XP để hoàn thành mục tiêu ngày.</p>
          <div className="mt-3 h-2 rounded-full bg-white/10">
            <div className="h-2 rounded-full bg-rose-400" style={{ width: `${levelProgress}%` }} />
          </div>
          <p className="mt-2 text-xs font-bold text-slate-400">{dailyState.totalXp}/{nextLevelXp} XP để lên level {level + 1}</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-rose-50 p-4">
            <div className="flex items-center gap-2 text-rose-600">
              <FiActivity className="h-5 w-5" />
              <span className="text-sm font-black">Streak</span>
            </div>
            <p className="mt-2 text-2xl font-black text-slate-950">{dailyState.streak} ngày</p>
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
        <button
          className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-rose-700 font-black text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-rose-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={dailyState.checkedIn}
          onClick={checkIn}
          type="button"
        >
          <FiGift /> {dailyState.checkedIn ? "Đã điểm danh hôm nay" : "Điểm danh +10 XP"}
        </button>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/[0.05]">
        <p className="mb-4 text-sm font-black uppercase tracking-widest text-teal-700">Nhiệm vụ ngày</p>
        {workingQuests.map((quest) => {
          const current = Math.min((dailyState[quest.field] as number) || 0, quest.target);
          const questDone = current >= quest.target;
          const claimed = dailyState.claimedQuests.includes(quest.id);

          return (
          <div className="mb-3 rounded-2xl bg-slate-50 p-3 transition-all duration-300 hover:bg-teal-50" key={quest.title}>
            <div className="flex items-center justify-between gap-3 text-sm font-bold">
              <span className="min-w-0">{quest.title}</span>
              <span className="shrink-0 rounded-full bg-white px-2 py-1 text-xs font-black text-rose-600">+{quest.xp} XP</span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-2 flex-1 rounded-full bg-slate-200">
                <div className="h-2 rounded-full bg-teal-500" style={{ width: `${(current / quest.target) * 100}%` }} />
              </div>
              <span className="text-xs font-black text-slate-400">{current}/{quest.target}</span>
            </div>
            {questDone && (
              <button
                className="mt-3 h-9 w-full rounded-xl bg-teal-700 text-xs font-black text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={claimed}
                onClick={() => claimQuest(quest.id, quest.xp)}
                type="button"
              >
                {claimed ? "Đã nhận thưởng" : `Nhận +${quest.xp} XP`}
              </button>
            )}
          </div>
          );
        })}
        <button className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-teal-200 bg-teal-50 font-black text-teal-800 transition-all duration-300 hover:-translate-y-0.5 hover:bg-teal-100" type="button">
          <FiCheckCircle className="h-5 w-5" /> {readyQuestCount > 0 ? `${readyQuestCount} nhiệm vụ chờ nhận` : "Bắt đầu kiếm XP"}
        </button>
      </div>
    </aside>
  );
}
