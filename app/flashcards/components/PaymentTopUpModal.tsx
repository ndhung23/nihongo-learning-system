"use client";

import { useEffect, useMemo, useState } from "react";
import { FiCheckCircle, FiClock, FiCopy, FiCreditCard, FiX } from "react-icons/fi";
import { invalidateCurrentUser } from "../currentUserClient";

type Payment = {
  id: string;
  kind: "ai" | "vip";
  amount: number;
  aiCredits: number;
  vipMonths: number;
  transferCode: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

export function PaymentTopUpModal({
  initialKind,
  onClose,
}: Readonly<{
  initialKind: "ai" | "vip";
  onClose: () => void;
}>) {
  const [kind, setKind] = useState<"ai" | "vip">(initialKind);
  const [amountText, setAmountText] = useState(initialKind === "vip" ? "20000" : "10000");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activePayment, setActivePayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [pricing, setPricing] = useState({ aiPrice: 1000, vipPrice: 20000, vipAiCredits: 100 });
  const [bank, setBank] = useState({ code: "", account: "", accountName: "" });
  const amount = Number(amountText) || 0;
  const benefit = kind === "ai" ? `${Math.floor(amount / pricing.aiPrice)} lượt AI` : `${Math.floor(amount / pricing.vipPrice)} tháng VIP + ${Math.floor(amount / pricing.vipPrice) * pricing.vipAiCredits} lượt AI`;
  const qrUrl = useMemo(() => {
    if (!activePayment || !bank.code || !bank.account || !bank.accountName) return "";
    const query = new URLSearchParams({
      amount: String(activePayment.amount),
      addInfo: activePayment.transferCode,
      accountName: bank.accountName,
    });
    return `https://img.vietqr.io/image/${encodeURIComponent(bank.code)}-${encodeURIComponent(bank.account)}-compact2.png?${query.toString()}`;
  }, [activePayment, bank]);

  useEffect(() => {
    void fetch("/api/payments", { cache: "no-store" }).then(async (response) => {
      const payload = (await response.json()) as { data?: Payment[]; message?: string };
      if (response.status === 401) throw new Error("Bạn cần đăng nhập để tạo yêu cầu nạp.");
      if (!response.ok) throw new Error(payload.message || "Không thể tải lịch sử.");
      setPayments(payload.data || []);
    }).catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Không thể tải lịch sử."));
    void fetch("/api/settings/public").then((response) => response.json()).then((payload: { data?: Record<string, unknown> }) => {
      const data = payload.data || {};
      const next = {
        aiPrice: Math.max(Number(data.aiCreditPriceVnd ?? 1000), 1),
        vipPrice: Math.max(Number(data.vipMonthlyPriceVnd ?? 20000), 1),
        vipAiCredits: Math.max(Number(data.vipMonthlyAiCredits ?? 100), 0),
      };
      setPricing(next);
      setBank({
        code: String(data.paymentBankCode || ""),
        account: String(data.paymentBankVirtualAccount || data.paymentBankAccount || ""),
        accountName: String(data.paymentBankAccountName || ""),
      });
      setAmountText(initialKind === "vip" ? String(next.vipPrice) : String(next.aiPrice * 10));
    }).catch(() => undefined);
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [initialKind, onClose]);

  useEffect(() => {
    if (!activePayment || activePayment.status !== "pending") return;
    let cancelled = false;
    const poll = async () => {
      const response = await fetch("/api/payments", { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as { data?: Payment[] };
      if (cancelled) return;
      const nextPayments = payload.data || [];
      setPayments(nextPayments);
      const updated = nextPayments.find((payment) => payment.id === activePayment.id);
      if (updated) {
        setActivePayment(updated);
        if (updated.status === "approved") {
          invalidateCurrentUser();
          window.dispatchEvent(new CustomEvent("nihongo-auth-changed"));
        }
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 3000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [activePayment]);

  function changeKind(nextKind: "ai" | "vip") {
    setKind(nextKind);
    setAmountText(nextKind === "vip" ? String(pricing.vipPrice) : String(pricing.aiPrice * 10));
    setActivePayment(null);
    setMessage("");
  }

  async function createPayment() {
    if (kind === "ai" && (amount < pricing.aiPrice || amount % pricing.aiPrice !== 0)) {
      setMessage(`Số tiền phải chia hết cho ${pricing.aiPrice.toLocaleString("vi-VN")}đ.`);
      return;
    }
    if (kind === "vip" && amount % pricing.vipPrice !== 0) {
      setMessage(`VIP có giá ${pricing.vipPrice.toLocaleString("vi-VN")}đ mỗi tháng.`);
      return;
    }

    setLoading(true);
    setMessage("");
    const response = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, amount }),
    });
    const payload = (await response.json()) as { data?: Payment; message?: string };
    if (response.ok && payload.data) {
      setActivePayment(payload.data);
      setPayments((current) => [payload.data as Payment, ...current]);
    } else {
      setMessage(payload.message || "Không thể tạo mã QR.");
    }
    setLoading(false);
  }

  return (
    <div
      aria-label="Nạp lượt AI hoặc nâng cấp VIP"
      aria-modal="true"
      className="fixed inset-0 z-[130] grid place-items-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
    >
      <div className="my-4 w-full max-w-3xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-gradient-to-r from-rose-50 to-teal-50 p-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-rose-600">Thanh toán QR · Tự động xác nhận</p>
            <h2 className="mt-2 text-2xl font-black">Nạp quyền lợi tài khoản</h2>
          </div>
          <button aria-label="Đóng" className="grid h-10 w-10 place-items-center rounded-full bg-white text-slate-500" onClick={onClose} type="button"><FiX /></button>
        </header>

        <div className="grid gap-5 p-5 md:grid-cols-[1fr_300px]">
          <section>
            <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
              <button className={`h-11 rounded-xl font-black ${kind === "ai" ? "bg-white text-teal-700 shadow" : "text-slate-500"}`} onClick={() => changeKind("ai")} type="button">Nạp lượt AI</button>
              <button className={`h-11 rounded-xl font-black ${kind === "vip" ? "bg-white text-violet-700 shadow" : "text-slate-500"}`} onClick={() => changeKind("vip")} type="button">Nạp VIP</button>
            </div>

            <label className="mt-5 block">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">Số tiền chuyển khoản</span>
              <div className="mt-2 flex h-14 items-center rounded-2xl border border-slate-200 px-4 focus-within:border-teal-400">
                <input className="min-w-0 flex-1 text-xl font-black outline-none" inputMode="numeric" min={kind === "vip" ? pricing.vipPrice : pricing.aiPrice} onChange={(event) => setAmountText(event.target.value.replace(/\D/g, ""))} step={kind === "vip" ? pricing.vipPrice : pricing.aiPrice} type="number" value={amountText} />
                <span className="font-black text-slate-400">đ</span>
              </div>
            </label>

            <div className="mt-3 rounded-2xl bg-teal-50 p-4 text-sm font-bold text-teal-800">
              Bạn sẽ nhận: <strong>{benefit}</strong>
            </div>
            <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
              Chuyển đúng số tiền và nội dung. Hệ thống sẽ tự động cộng quyền lợi sau khi ngân hàng báo tiền vào.
            </p>
            {message && <p className="mt-3 rounded-2xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{message}</p>}
            <button className="mt-4 h-12 w-full rounded-2xl bg-slate-950 font-black text-white disabled:opacity-50" disabled={loading} onClick={() => void createPayment()} type="button">
              <FiCreditCard className="mr-2 inline" /> {loading ? "Đang tạo..." : "Tạo mã QR"}
            </button>

            <div className="mt-6">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-500">Lịch sử gần đây</h3>
              <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                {payments.map((payment) => (
                  <button className="flex w-full items-center justify-between rounded-2xl bg-slate-50 p-3 text-left" key={payment.id} onClick={() => setActivePayment(payment)} type="button">
                    <span>
                      <span className="block text-sm font-black">{payment.kind === "vip" ? `VIP ${payment.vipMonths} tháng` : `${payment.aiCredits} lượt AI`}</span>
                      <span className="text-xs font-bold text-slate-400">{payment.amount.toLocaleString("vi-VN")}đ · {payment.transferCode}</span>
                    </span>
                    <PaymentStatus status={payment.status} />
                  </button>
                ))}
                {!payments.length && <p className="text-sm font-bold text-slate-400">Chưa có giao dịch.</p>}
              </div>
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-center">
            {activePayment && qrUrl ? (
              <>
                <p className="text-xs font-black uppercase tracking-wider text-teal-700">Quét để chuyển khoản</p>
                <img alt={`Mã QR chuyển khoản ${activePayment.amount.toLocaleString("vi-VN")} đồng`} className="mx-auto mt-3 w-full max-w-64 rounded-2xl bg-white" src={qrUrl} />
                <p className="mt-3 text-lg font-black">{activePayment.amount.toLocaleString("vi-VN")}đ</p>
                <p className="mt-1 text-sm font-bold text-slate-500">{bank.code} · {bank.account}</p>
                <p className="text-sm font-bold text-slate-500">{bank.accountName}</p>
                <button className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 font-mono text-sm font-black text-slate-800 shadow" onClick={() => void navigator.clipboard.writeText(activePayment.transferCode)} type="button">
                  {activePayment.transferCode} <FiCopy />
                </button>
                <p className="mt-3 text-xs font-bold text-rose-600">Không sửa số tiền hoặc nội dung chuyển khoản.</p>
              </>
            ) : activePayment ? (
              <div className="grid min-h-80 place-items-center text-sm font-bold text-rose-600">Chưa cấu hình đầy đủ thông tin ngân hàng.</div>
            ) : (
              <div className="grid min-h-80 place-items-center text-sm font-bold text-slate-400">Nhập số tiền và tạo mã QR.</div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function PaymentStatus({ status }: Readonly<{ status: Payment["status"] }>) {
  if (status === "approved") return <span className="inline-flex items-center gap-1 text-xs font-black text-teal-700"><FiCheckCircle /> Đã duyệt</span>;
  if (status === "rejected") return <span className="text-xs font-black text-rose-700">Từ chối</span>;
  return <span className="inline-flex items-center gap-1 text-xs font-black text-amber-700"><FiClock /> Chờ duyệt</span>;
}
