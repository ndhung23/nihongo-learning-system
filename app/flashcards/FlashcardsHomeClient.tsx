"use client";

import { useRouter } from "next/navigation";
import type { PublicCourse } from "@/lib/publicCourses";
import { LibraryScreen } from "./screens/LibraryScreen";
import type { StudyMode } from "./types";

export function FlashcardsHomeClient({ initialCourses }: Readonly<{ initialCourses: PublicCourse[] }>) {
  const router = useRouter();

  function openStudy(mode: StudyMode = "flashcard", deckId?: string, lesson?: string) {
    const params = new URLSearchParams({ mode });
    if (deckId) params.set("deckId", deckId);
    if (lesson && lesson !== "all") params.set("lesson", lesson);
    router.push(`/flashcards/study?${params.toString()}`);
  }

  return (
    <LibraryScreen
      initialCourses={initialCourses}
      onAdd={() => router.push("/flashcards/add")}
      onManage={() => router.push("/flashcards/manage")}
      onStudy={openStudy}
      onTest={(level, number) =>
        router.push(level && number ? `/flashcards/tests/${level.toLowerCase()}/${number}` : "/flashcards/tests")
      }
    />
  );
}
