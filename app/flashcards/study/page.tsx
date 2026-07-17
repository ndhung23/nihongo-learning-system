import { StudyClient } from "./StudyClient";
import type { StudyMode } from "../types";

const validModes: StudyMode[] = ["meaning", "flashcard", "typing", "example"];

export default async function StudyPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ deckId?: string; mode?: string }>;
}>) {
  const { deckId, mode } = await searchParams;
  const initialMode = validModes.includes(mode as StudyMode) ? (mode as StudyMode) : "flashcard";

  return <StudyClient initialDeckId={deckId} initialMode={initialMode} />;
}
