"use client";

import { useRouter } from "next/navigation";
import { LibraryScreen } from "./screens/LibraryScreen";
import type { StudyMode } from "./types";

export default function FlashcardsPage() {
  const router = useRouter();

  function openStudy(mode: StudyMode = "flashcard", deckId?: string, lesson?: string) {
    const params = new URLSearchParams({ mode });

    if (deckId) {
      params.set("deckId", deckId);
    }

    if (lesson && lesson !== "all") {
      params.set("lesson", lesson);
    }

    router.push(`/flashcards/study?${params.toString()}`);
  }

  return (
    <LibraryScreen
      onAdd={() => router.push("/flashcards/add")}
      onManage={() => router.push("/flashcards/manage")}
      onStudy={openStudy}
    />
  );
}
