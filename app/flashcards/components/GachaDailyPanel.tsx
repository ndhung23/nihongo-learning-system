"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FiActivity, FiCpu, FiDollarSign, FiGift, FiStar, FiX } from "react-icons/fi";
import {
  dailyAuthChangedEvent,
  getDailyProgressStorageKey,
  resolveDailyProgressStorageKey,
} from "./dailyProgressStorage";
import { PaymentTopUpModal } from "./PaymentTopUpModal";

type DailyState = {
  date: string;
  tickets: number;
  coins: number;
  aiCredits: number;
  streak: number;
  checkedIn: boolean;
  sessions: number;
  correctAnswers: number;
  newWords: number;
  claimedQuests: string[];
};

const quests = [
  { id: "session", title: "Hoàn thành 1 phiên ôn tập", target: 1, field: "sessions" },
  { id: "correct", title: "Trả lời đúng 10 thẻ", target: 10, field: "correctAnswers" },
  { id: "newWords", title: "Học 5 từ mới", target: 5, field: "newWords" },
] as const;

const prizes = [
  { label: "+1 vé Gacha", wheelLabel: "+1 vé", chance: 25, kind: "ticket", color: "#fb7185" },
  { label: "Chúc bạn may mắn lần sau", wheelLabel: "Chúc may mắn", chance: 25, kind: "none", color: "#fbbf24" },
  { label: "Thẻ cào 100K", wheelLabel: "Thẻ 100K", chance: 0, kind: "scratch", color: "#a78bfa" },
  { label: "+1 lượt dùng API AI", wheelLabel: "+1 lượt AI", chance: 20, kind: "ai", color: "#38bdf8" },
  { label: "Cơ hội quay lại", wheelLabel: "Quay lại", chance: 15, kind: "retry", color: "#2dd4bf" },
  { label: "100 xu", wheelLabel: "100 xu", chance: 15, kind: "coins", color: "#fb923c" },
] as const;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function createDailyState(): DailyState {
  return {
    date: todayKey(),
    tickets: 0,
    coins: 0,
    aiCredits: 0,
    streak: 0,
    checkedIn: false,
    sessions: 0,
    correctAnswers: 0,
    newWords: 0,
    claimedQuests: [],
  };
}

function readDailyState(storageKey: string): DailyState {
  const fallback = createDailyState();
  if (typeof window === "undefined") return fallback;

  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) || "{}") as Partial<DailyState>;
    const balances = {
      tickets: Number(parsed.tickets) || 0,
      coins: Number(parsed.coins) || 0,
      aiCredits: Number(parsed.aiCredits) || 0,
      streak: Number(parsed.streak) || 0,
    };

    if (parsed.date !== todayKey()) return { ...fallback, ...balances };

    return {
      ...fallback,
      ...parsed,
      ...balances,
      claimedQuests: Array.isArray(parsed.claimedQuests) ? parsed.claimedQuests : [],
    };
  } catch {
    return fallback;
  }
}

function saveDailyState(storageKey: string, next: DailyState) {
  window.localStorage.setItem(storageKey, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("nihongo-daily-progress-updated"));
}

function randomPercent() {
  const values = new Uint32Array(1);
  window.crypto.getRandomValues(values);
  return (values[0] / 2 ** 32) * 100;
}

export function GachaDailyPanel() {
  const [activeStorageKey, setActiveStorageKey] = useState(() => getDailyProgressStorageKey());
  const [dailyState, setDailyState] = useState<DailyState>(createDailyState);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [lastPrize, setLastPrize] = useState("");
  const [resultOpen, setResultOpen] = useState(false);
  const [paymentKind, setPaymentKind] = useState<"ai" | "vip" | null>(null);
  const soundTimerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const claimedAdminTicketsForRef = useRef("");
  const readyQuestCount = useMemo(
    () =>
      quests.filter(
        (quest) =>
          dailyState[quest.field] >= quest.target && !dailyState.claimedQuests.includes(quest.id),
      ).length,
    [dailyState],
  );

  useEffect(() => {
    const sync = () => setDailyState(readDailyState(activeStorageKey));
    const switchOwner = (event: Event) => {
      const detail = (event as CustomEvent<{ storageKey?: string; aiCredits?: number }>).detail;
      if (detail?.storageKey) {
        if (typeof detail.aiCredits === "number") {
          const accountState = readDailyState(detail.storageKey);
          saveDailyState(detail.storageKey, { ...accountState, aiCredits: detail.aiCredits });
        }
        setActiveStorageKey(detail.storageKey);
      }
    };
    void resolveDailyProgressStorageKey().then(setActiveStorageKey);
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("nihongo-daily-progress-updated", sync);
    window.addEventListener(dailyAuthChangedEvent, switchOwner);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("nihongo-daily-progress-updated", sync);
      window.removeEventListener(dailyAuthChangedEvent, switchOwner);
    };
  }, [activeStorageKey]);

  useEffect(() => {
    if (
      activeStorageKey.endsWith(":guest") ||
      claimedAdminTicketsForRef.current === activeStorageKey
    ) {
      return;
    }
    claimedAdminTicketsForRef.current = activeStorageKey;

    void fetch("/api/profile", { method: "POST" })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as { claimedGachaTickets?: number };
        const claimed = Math.max(Number(payload.claimedGachaTickets) || 0, 0);
        if (claimed < 1) return;
        const current = readDailyState(activeStorageKey);
        saveDailyState(activeStorageKey, { ...current, tickets: current.tickets + claimed });
      })
      .catch(() => undefined);
  }, [activeStorageKey]);

  useEffect(
    () => () => {
      if (soundTimerRef.current !== null) window.clearInterval(soundTimerRef.current);
      void audioContextRef.current?.close();
    },
    [],
  );

  function playTone(frequency: number, duration: number, volume = 0.035) {
    const AudioContextClass = window.AudioContext;
    const context = audioContextRef.current || new AudioContextClass();
    audioContextRef.current = context;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }

  function updateDailyState(next: DailyState) {
    setDailyState(next);
    saveDailyState(activeStorageKey, next);
  }

  function checkIn() {
    if (dailyState.checkedIn) return;
    updateDailyState({
      ...dailyState,
      checkedIn: true,
      streak: dailyState.streak + 1,
      tickets: dailyState.tickets + 1,
    });
  }

  function claimQuest(questId: string) {
    if (dailyState.claimedQuests.includes(questId)) return;
    updateDailyState({
      ...dailyState,
      tickets: dailyState.tickets + 1,
      claimedQuests: [...dailyState.claimedQuests, questId],
    });
  }

  function spin() {
    if (spinning || dailyState.tickets < 1) return;

    let roll = randomPercent();
    let selectedIndex = 0;
    for (let index = 0; index < prizes.length; index += 1) {
      if (prizes[index].chance === 0) continue;
      roll -= prizes[index].chance;
      if (roll < 0) {
        selectedIndex = index;
        break;
      }
    }

    const prize = prizes[selectedIndex];
    const landingRotation = 360 - (selectedIndex * 60 + 30);
    const correction = (landingRotation - (rotation % 360) + 360) % 360;
    const nextRotation = rotation + 360 * 6 + correction;
    setLastPrize("");
    setResultOpen(false);
    setSpinning(true);
    setRotation(nextRotation);
    updateDailyState({ ...dailyState, tickets: dailyState.tickets - 1 });
    playTone(520, 0.06);
    soundTimerRef.current = window.setInterval(() => playTone(420 + Math.random() * 180, 0.035, 0.025), 105);

    window.setTimeout(() => {
      if (soundTimerRef.current !== null) {
        window.clearInterval(soundTimerRef.current);
        soundTimerRef.current = null;
      }
      const current = readDailyState(activeStorageKey);
      const next = { ...current };
      if (prize.kind === "ticket" || prize.kind === "retry") next.tickets += 1;
      if (prize.kind === "ai") next.aiCredits += 1;
      if (prize.kind === "coins") next.coins += 100;
      updateDailyState(next);
      setLastPrize(prize.label);
      setResultOpen(true);
      setSpinning(false);
      playTone(prize.kind === "none" ? 260 : 784, 0.28, 0.06);
    }, 2600);
  }

  return (
    <aside className="space-y-5">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/[0.05]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-rose-600">Phần thưởng Gacha</p>
            <h3 className="mt-2 text-2xl font-black text-slate-950">{dailyState.tickets} vé Gacha</h3>
          </div>
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-100 text-2xl text-amber-600">
            <FiGift />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat icon={<FiActivity />} label="Streak" value={`${dailyState.streak} ngày`} />
          <Stat icon={<FiDollarSign />} label="Xu" value={dailyState.coins} />
          <Stat icon={<FiCpu />} label="Lượt AI" value={dailyState.aiCredits} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button className="h-10 rounded-xl border border-teal-200 bg-teal-50 text-xs font-black text-teal-800 transition hover:bg-teal-100" onClick={() => setPaymentKind("ai")} type="button">
            Nạp lượt AI
          </button>
          <button className="h-10 rounded-xl border border-violet-200 bg-violet-50 text-xs font-black text-violet-800 transition hover:bg-violet-100" onClick={() => setPaymentKind("vip")} type="button">
            Nâng cấp VIP
          </button>
        </div>

        <button
          className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 font-black text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={dailyState.checkedIn}
          onClick={checkIn}
          type="button"
        >
          <FiGift /> {dailyState.checkedIn ? "Đã điểm danh hôm nay" : "Điểm danh +1 vé Gacha"}
        </button>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/[0.05]">
        <div className="text-center">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-600">Vòng quay Gacha</p>
          <p className="mt-1 text-sm font-bold text-slate-500">Mỗi lượt quay sử dụng 1 vé</p>
        </div>
        <div className="relative mx-auto mt-5 aspect-square w-full max-w-[250px]">
          <div className="absolute left-1/2 top-[-5px] z-20 h-0 w-0 -translate-x-1/2 border-x-[13px] border-t-[24px] border-x-transparent border-t-slate-950" />
          <div
            className="h-full w-full rounded-full border-[8px] border-slate-950 shadow-xl"
            style={{
              background: `conic-gradient(${prizes.map((prize, index) => `${prize.color} ${index * 60}deg ${(index + 1) * 60}deg`).join(",")})`,
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? "transform 2.6s cubic-bezier(0.12, 0.72, 0.12, 1)" : "none",
            }}
          >
            {prizes.map((prize, index) => (
              <span
                className="absolute left-1/2 top-1/2 w-[72px] text-center text-[11px] font-black leading-[1.15] text-white drop-shadow-md"
                key={index}
                style={{
                  transform: `translate(-50%, -50%) rotate(${index * 60 + 30}deg) translateY(-76px) rotate(-${index * 60 + 30}deg)`,
                }}
              >
                {prize.wheelLabel}
              </span>
            ))}
          </div>
          <button
            className="absolute left-1/2 top-1/2 z-10 grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-white bg-slate-950 text-sm font-black text-white shadow-xl disabled:bg-slate-400"
            disabled={spinning || dailyState.tickets < 1}
            onClick={spin}
            type="button"
          >
            {spinning ? "Đang quay" : "QUAY"}
          </button>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/[0.05]">
        <p className="mb-4 text-sm font-black uppercase tracking-widest text-teal-700">Nhiệm vụ ngày</p>
        {quests.map((quest) => {
          const current = Math.min(dailyState[quest.field], quest.target);
          const done = current >= quest.target;
          const claimed = dailyState.claimedQuests.includes(quest.id);
          return (
            <div className="mb-3 rounded-2xl bg-slate-50 p-3" key={quest.id}>
              <div className="flex items-center justify-between gap-3 text-sm font-bold">
                <span>{quest.title}</span>
                <span className="shrink-0 rounded-full bg-white px-2 py-1 text-xs font-black text-rose-600">+1 vé</span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-2 flex-1 rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-teal-500" style={{ width: `${(current / quest.target) * 100}%` }} />
                </div>
                <span className="text-xs font-black text-slate-400">{current}/{quest.target}</span>
              </div>
              {done && (
                <button
                  className="mt-3 h-9 w-full rounded-xl bg-teal-700 text-xs font-black text-white disabled:bg-slate-300"
                  disabled={claimed}
                  onClick={() => claimQuest(quest.id)}
                  type="button"
                >
                  {claimed ? "Đã nhận vé" : "Nhận 1 vé Gacha"}
                </button>
              )}
            </div>
          );
        })}
        <div className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-teal-200 bg-teal-50 font-black text-teal-800">
          <FiStar /> {readyQuestCount > 0 ? `${readyQuestCount} nhiệm vụ chờ nhận vé` : "Hoàn thành nhiệm vụ để nhận vé"}
        </div>
      </section>

      {resultOpen && lastPrize && (
        <div
          aria-modal="true"
          className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/60 p-5 backdrop-blur-sm"
          onClick={() => setResultOpen(false)}
          role="dialog"
        >
          <div
            className="relative w-full max-w-sm overflow-hidden rounded-[2rem] bg-white p-7 text-center shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              aria-label="Đóng"
              className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
              onClick={() => setResultOpen(false)}
              type="button"
            >
              <FiX />
            </button>
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-rose-500 text-4xl text-white shadow-lg">
              <FiGift />
            </div>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.24em] text-rose-600">Kết quả Gacha</p>
            <h4 className="mt-2 text-2xl font-black text-slate-950">{lastPrize}</h4>
            <button
              className="mt-6 h-12 w-full rounded-2xl bg-slate-950 font-black text-white hover:bg-slate-800"
              onClick={() => setResultOpen(false)}
              type="button"
            >
              Tuyệt vời
            </button>
          </div>
        </div>
      )}
      {paymentKind && (
        <PaymentTopUpModal initialKind={paymentKind} onClose={() => setPaymentKind(null)} />
      )}
    </aside>
  );
}

function Stat({ icon, label, value }: Readonly<{ icon: React.ReactNode; label: string; value: React.ReactNode }>) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 text-center">
      <div className="flex items-center justify-center gap-1 text-xs font-black text-slate-500">{icon}{label}</div>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}
