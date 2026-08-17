import { getCachedPublicCourses } from "@/lib/publicCourses";
import { AppShell } from "./flashcards/components/AppShell";
import { FlashcardsHomeClient } from "./flashcards/FlashcardsHomeClient";
import { cookies } from "next/headers";

export default async function Home() {
  const initialCourses = await getCachedPublicCourses("newest", "all", "", 24);
  const cookieStore = await cookies();
  const savedLocale = cookieStore.get("nihongo-language")?.value;
  const initialLocale = savedLocale === "en" ? "en" : "vi";
// 
  return (
    <AppShell initialLocale={initialLocale}>
      <FlashcardsHomeClient initialCourses={initialCourses} />
    </AppShell>
  );
}
