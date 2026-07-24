import { getCachedPublicCourses } from "@/lib/publicCourses";
import { AppShell } from "./flashcards/components/AppShell";
import { FlashcardsHomeClient } from "./flashcards/FlashcardsHomeClient";

export default async function Home() {
  const initialCourses = await getCachedPublicCourses("newest", "all", "", 24);

  return (
    <AppShell>
      <FlashcardsHomeClient initialCourses={initialCourses} />
    </AppShell>
  );
}
