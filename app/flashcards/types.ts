import type { IconType } from "react-icons";

export type Screen = "library" | "add" | "manage" | "shop" | "study";

export type StudyMode = "meaning" | "flashcard" | "typing" | "example";

export type AnswerState = "idle" | "correct" | "wrong";

export type Word = {
  id?: string;
  deckId?: string;
  term: string;
  kana: string;
  romaji: string;
  type: string;
  meaning: string;
  wrong: string[];
  example: string;
  exampleVi: string;
  tags: string[];
  sourceUrl?: string;
};

export type Deck = {
  title: string;
  total: number;
  newWords: number;
  review: number;
  accent: "red" | "green" | "blue" | "violet" | "amber";
  tags: string[];
};

export type StudyModeItem = {
  id: StudyMode;
  title: string;
  subtitle: string;
  icon: IconType;
};
