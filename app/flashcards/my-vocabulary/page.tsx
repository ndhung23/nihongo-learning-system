"use client";

import { Suspense } from "react";
import { PersonalDecksClient } from "./PersonalDecksClient";

export default function MyVocabularyPage() {
  return (
    <Suspense>
      <PersonalDecksClient />
    </Suspense>
  );
}
