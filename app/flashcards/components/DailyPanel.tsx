export function DailyPanel() {
  return (
    <aside className="space-y-5">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/[0.05]">
        <div className="flex items-center justify-between text-xs font-black text-slate-500">
          <span>Hạt giống</span>
          <span>Còn 1 ngày</span>
          <span>Mầm non</span>
        </div>
        <div className="mt-4 h-2 rounded-full bg-slate-100">
          <div className="h-2 w-2/3 rounded-full bg-teal-400" />
        </div>
        <div className="mx-auto mt-6 grid h-24 w-24 place-items-center rounded-[1.5rem] bg-gradient-to-br from-teal-50 to-rose-50 text-5xl">
          芽
        </div>
        <h3 className="mt-4 text-center text-2xl font-black text-slate-700">Cây 0 ngày</h3>
        <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-center text-sm italic leading-6 text-slate-500">
          &quot;Học ít nhưng đều sẽ thắng học nhiều rồi bỏ.&quot;
        </p>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/[0.05]">
        <p className="mb-4 text-sm font-black uppercase tracking-widest text-rose-700">Điểm danh</p>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, index) => (
            <div className={`rounded-xl border py-2 text-center text-xs font-black ${index === 6 ? "border-rose-300 bg-rose-100 text-rose-700" : "border-amber-200 bg-amber-50 text-amber-700"}`} key={index}>
              +20
            </div>
          ))}
        </div>
        <button className="mt-4 h-11 w-full rounded-2xl bg-rose-700 font-black text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-rose-800" type="button">
          Nhận ngay
        </button>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/[0.05]">
        <p className="mb-4 text-sm font-black uppercase tracking-widest text-teal-700">Nhiệm vụ ngày</p>
        {[
          ["Khám phá từ mới", 10],
          ["Ôn tập trí nhớ", 20],
          ["Thời gian học", 30],
        ].map(([task, total]) => (
          <div className="mb-3 rounded-2xl bg-slate-50 p-3 transition-all duration-300 hover:bg-teal-50" key={task as string}>
            <div className="flex items-center justify-between text-sm font-bold">
              <span>{task}</span>
              <span className="text-slate-400">0/{total}</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-200" />
          </div>
        ))}
      </div>
    </aside>
  );
}
