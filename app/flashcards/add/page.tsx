"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { AddWordScreen } from "../screens/AddWordScreen";

export default function AddVocabularyPage() {
  return <Suspense><AddVocabularyContent /></Suspense>;
}

function AddVocabularyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deckId = searchParams.get("deckId") || "";
  const returnHref = deckId ? `/flashcards/my-vocabulary?deckId=${encodeURIComponent(deckId)}` : "/flashcards/my-vocabulary";

  useEffect(() => {
    if (!deckId) router.replace("/flashcards/my-vocabulary");
  }, [deckId, router]);

  if (!deckId) {
    return null;
  }

  return (
    <AddWordScreen
      deckId={deckId}
      onBack={() => router.push(returnHref)}
      onSaved={() => router.push(returnHref)}
    />
  );
}
