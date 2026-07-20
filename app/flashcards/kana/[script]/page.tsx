import { notFound } from "next/navigation";
import { isKanaScript } from "../data";
import { KanaQuiz } from "./KanaQuiz";

export function generateStaticParams() {
  return [{ script: "hiragana" }, { script: "katakana" }];
}

export default async function KanaPracticePage({
  params,
}: PageProps<"/flashcards/kana/[script]">) {
  const { script } = await params;
  if (!isKanaScript(script)) notFound();
  return <KanaQuiz script={script} />;
}
