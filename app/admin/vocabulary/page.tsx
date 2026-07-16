import { connectMongoDB } from "@/lib/mongodb";
import { VocabularyModel } from "@/models/Vocabulary";

export default async function AdminVocabularyPage() {
  await connectMongoDB();

  const vocabulary = await VocabularyModel.find({})
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.28em] text-teal-300">Admin</p>
      <h1 className="mt-3 text-4xl font-black">Quản lý từ vựng</h1>
      <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-white/5">
        {vocabulary.map((item) => (
          <div className="grid gap-3 border-t border-white/10 px-5 py-4 text-sm md:grid-cols-[1fr_1fr_1fr]" key={String(item._id)}>
            <span className="font-black">{item.term}</span>
            <span className="text-slate-300">{item.meaningVi}</span>
            <span className="text-teal-200">{item.level}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
