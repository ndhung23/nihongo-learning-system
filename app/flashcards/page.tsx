"use client";

import { useRouter } from "next/navigation";
import { LibraryScreen } from "./screens/LibraryScreen";
import type { StudyMode } from "./types";

export default function FlashcardsPage() {
  const router = useRouter();

  function openStudy(mode: StudyMode = "meaning") {
    router.push(`/flashcards/study?mode=${mode}`);
  }

  return (
    <LibraryScreen
      onAdd={() => router.push("/flashcards/add")}
      onManage={() => router.push("/flashcards/manage")}
      onStudy={openStudy}
    />
  );
}
