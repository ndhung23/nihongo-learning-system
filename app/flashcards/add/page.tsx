"use client";

import { useRouter } from "next/navigation";
import { AddWordScreen } from "../screens/AddWordScreen";

export default function AddVocabularyPage() {
  const router = useRouter();

  return (
    <AddWordScreen
      onBack={() => router.push("/flashcards/my-vocabulary")}
      onSaved={() => router.push("/flashcards/my-vocabulary")}
    />
  );
}
