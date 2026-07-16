"use client";

import { useRouter } from "next/navigation";
import { ManageScreen } from "../screens/ManageScreen";

export default function ManageVocabularyPage() {
  const router = useRouter();

  return <ManageScreen onBack={() => router.push("/flashcards")} />;
}
