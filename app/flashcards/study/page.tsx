import { StudyClient } from "./StudyClient";
import type { StudyMode } from "../types";

const validModes: StudyMode[] = ["meaning", "flashcard", "typing", "example"];

export default async function StudyPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ mode?: string }>;
}>) {
  const { mode } = await searchParams;
  const initialMode = validModes.includes(mode as StudyMode) ? (mode as StudyMode) : "meaning";

  return <StudyClient initialMode={initialMode} />;
}
