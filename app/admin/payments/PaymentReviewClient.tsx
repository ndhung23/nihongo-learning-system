"use client";

import { useEffect, useState } from "react";
import { FiCheck, FiClock, FiRefreshCw, FiX } from "react-icons/fi";

type Payment = {
  id: string;
  user?: { username?: string; email?: string; displayName?: string };
  kind: "ai" | "vip";
  amount: number;
  aiCredits: number;
  vipMonths: number;
  transferCode: string;
  status: "pending" | "approved" | "rejected";
  adminNote?: string;
  createdAt: string;
};

export function PaymentReviewClient() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [message, setMessage] = useState("");

  async function loadPayments() {
    setLoading(true);
    const response = await fetch("/api/admin/payments", { cache: "no-store" });
    const payload = (await response.json()) as { data?: Payment[]; message?: string };
    setPayments(payload.data || []);
    setMessage(response.ok ? "" : payload.message || "Không thể tải yêu cầu.");
    setLoading(false);
  }

  useEffect(() => {
    void loadPayments();
  }, []);

  async function review(id: string, action: "approve" | "reject") {
    setWorkingId(id);
    setMessage("");
    const response = await fetch(`/api/admin/payments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const payload = (await response.json()) as { message?: string };
    if (!response.ok) setMessage(payload.message || "Không thể xử lý yêu cầu.");
    else await loadPayments();
    setWorkingId("");
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-rose-600">Thanh toán thủ công</p>
          <h1 className="mt-2 text-3xl font-black">Duyệt yêu cầu QR</h1>
          <p className="mt-2 text-sm font-bold text-slate-500">Chỉ duyệt sau khi đã kiểm tra tiền vào đúng số tiền và nội dung.</p>
        </div>
        <button className="inline-flex h-11 items-center gap-2 rounded-2xl bg-slate-950 px-5 font-black text-white" onClick={() => void loadPayments()} type="button">
          <FiRefreshCw /> Làm mới
        </button>
      </div>

      {message && <p className="mt-5 rounded-2xl bg-rose-50 p-4 font-bold text-rose-700">{message}</p>}
      <div className="mt-6 space-y-3">
        {payments.map((payment) => (
          <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-900/[0.04]" key={payment.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Status status={payment.status} />
                  <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black uppercase text-violet-700">
                    {payment.kind === "vip" ? `VIP ${payment.vipMonths} tháng` : `${payment.aiCredits} lượt AI`}
                  </span>
                </div>
                <h2 className="mt-3 text-lg font-black">{payment.user?.displayName || payment.user?.username || "Người dùng"}</h2>
                <p className="text-sm font-bold text-slate-500">{payment.user?.email}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-teal-700">{payment.amount.toLocaleString("vi-VN")}đ</p>
                <p className="mt-1 font-mono text-sm font-black text-slate-700">{payment.transferCode}</p>
                <p className="mt-1 text-xs font-bold text-slate-400">{new Date(payment.createdAt).toLocaleString("vi-VN")}</p>
              </div>
            </div>
            {payment.status === "pending" && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button className="h-11 rounded-2xl bg-teal-600 font-black text-white disabled:opacity-50" disabled={workingId === payment.id} onClick={() => void review(payment.id, "approve")} type="button">
                  <FiCheck className="mr-2 inline" /> Xác nhận đã nhận tiền
                </button>
                <button className="h-11 rounded-2xl border border-rose-200 bg-rose-50 font-black text-rose-700 disabled:opacity-50" disabled={workingId === payment.id} onClick={() => void review(payment.id, "reject")} type="button">
                  <FiX className="mr-2 inline" /> Từ chối
                </button>
              </div>
            )}
          </article>
        ))}
        {!loading && payments.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center font-bold text-slate-500">Chưa có yêu cầu thanh toán.</div>}
        {loading && <div className="rounded-2xl bg-white p-8 text-center font-bold text-slate-500">Đang tải...</div>}
      </div>
    </div>
  );
}

function Status({ status }: Readonly<{ status: Payment["status"] }>) {
  const styles = {
    pending: "bg-amber-50 text-amber-700",
    approved: "bg-teal-50 text-teal-700",
    rejected: "bg-rose-50 text-rose-700",
  };
  const labels = { pending: "Chờ duyệt", approved: "Đã duyệt", rejected: "Từ chối" };
  return <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ${styles[status]}`}><FiClock /> {labels[status]}</span>;
}
