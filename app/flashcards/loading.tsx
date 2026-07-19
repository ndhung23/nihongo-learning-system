export default function FlashcardsLoading() {
  return (
    <div className="mx-auto max-w-[1500px] animate-pulse px-4 py-8 sm:px-6 lg:px-10">
      <div className="h-7 w-40 rounded-full bg-slate-200" />
      <div className="mt-5 h-12 w-full max-w-xl rounded-2xl bg-slate-200" />
      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div className="h-64 rounded-[2rem] border border-slate-200 bg-white shadow-sm" key={index}>
            <div className="space-y-4 p-6">
              <div className="h-12 w-12 rounded-2xl bg-slate-200" />
              <div className="h-6 w-3/4 rounded-lg bg-slate-200" />
              <div className="h-4 w-full rounded bg-slate-100" />
              <div className="h-4 w-2/3 rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
