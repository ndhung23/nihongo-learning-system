import Link from "next/link";
import { FiArrowLeft, FiClock, FiShoppingBag } from "react-icons/fi";

export default function CoinShopPage() {
  return (
    <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-[1500px] place-items-center px-4 py-10 sm:px-6 lg:px-10">
      <section className="w-full max-w-2xl rounded-[2rem] border border-amber-200 bg-white p-8 text-center shadow-2xl shadow-amber-500/10 sm:p-12">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-amber-300 to-orange-500 text-4xl text-white shadow-xl shadow-amber-500/25">
          <FiShoppingBag />
        </div>
        <p className="mt-6 text-xs font-black uppercase tracking-[0.24em] text-amber-600">Cửa hàng xu</p>
        <h1 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">Tính năng đang phát triển</h1>
        <p className="mx-auto mt-4 max-w-md text-base font-semibold leading-7 text-slate-500">
          Sớm mở lại shop. Hãy tích lũy xu và quay lại trong thời gian tới nhé!
        </p>
        <div className="mx-auto mt-6 flex w-fit items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm font-black text-amber-700">
          <FiClock /> Đang hoàn thiện
        </div>
        <Link
          className="mx-auto mt-8 flex h-12 w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-slate-950 font-black text-white transition hover:-translate-y-0.5 hover:bg-amber-600"
          href="/flashcards"
        >
          <FiArrowLeft /> Quay lại thư viện
        </Link>
      </section>
    </div>
  );
}
