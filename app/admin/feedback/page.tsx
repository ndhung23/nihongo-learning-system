import { FiMail } from "react-icons/fi";
import { connectMongoDB } from "@/lib/mongodb";
import { FeedbackModel } from "@/models/Feedback";

export default async function AdminFeedbackPage() {
  await connectMongoDB();

  const feedbackItems = await FeedbackModel.find()
    .sort({ createdAt: -1 })
    .limit(80)
    .lean();

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-teal-700">Góp ý người dùng</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Hộp thư góp ý</h1>
          <p className="mt-3 max-w-2xl text-slate-500">Tất cả nhận xét gửi từ nút email trong hệ thống sẽ nằm ở đây.</p>
        </div>
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-2xl text-rose-700">
          <FiMail />
        </div>
      </div>

      <section className="mt-8 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/[0.04]">
        <div className="grid gap-3">
          {feedbackItems.map((item) => (
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={String(item._id)}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-black text-slate-950">{item.name || "Khách"}</p>
                  <p className="mt-1 text-sm font-bold text-slate-500">{item.email || "Không có email"}</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-teal-700">
                  {item.createdAt ? new Date(item.createdAt).toLocaleString("vi-VN") : "Mới"}
                </span>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-sm font-semibold leading-7 text-slate-700">{item.message}</p>
              {item.page && <p className="mt-3 text-xs font-bold text-slate-400">Trang gửi: {item.page}</p>}
            </article>
          ))}
        </div>

        {feedbackItems.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center font-bold text-slate-500">
            Chưa có góp ý nào.
          </div>
        )}
      </section>
    </div>
  );
}
