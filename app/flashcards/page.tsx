import { getCachedPublicCourses } from "@/lib/publicCourses";
import { FlashcardsHomeClient } from "./FlashcardsHomeClient";

export default async function FlashcardsPage() {
  const initialCourses = await getCachedPublicCourses("newest", "all", "", 24);
  return <FlashcardsHomeClient initialCourses={initialCourses} />;
}
