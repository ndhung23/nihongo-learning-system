import type { Word } from "./types";

export type VocabularyBookmark = {
  key: string;
  id?: string;
  deckId?: string;
  courseTitle?: string;
  term: string;
  kana: string;
  romaji: string;
  type: string;
  meaning: string;
  example: string;
  exampleVi: string;
  savedAt: string;
};

export const vocabularyBookmarkKey = "nihongo-vocabulary-bookmarks";

export function getWordBookmarkKey(word: Pick<Word, "id" | "deckId" | "term" | "meaning">) {
  return word.id || [word.deckId || "local", word.term, word.meaning].join(":");
}

export function readVocabularyBookmarks() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(vocabularyBookmarkKey) || "[]") as VocabularyBookmark[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeVocabularyBookmarks(bookmarks: VocabularyBookmark[]) {
  window.localStorage.setItem(vocabularyBookmarkKey, JSON.stringify(bookmarks));
  window.dispatchEvent(new CustomEvent("nihongo-vocabulary-bookmarks-updated"));
}

export function toVocabularyBookmark(word: Word, courseTitle?: string): VocabularyBookmark {
  return {
    key: getWordBookmarkKey(word),
    id: word.id,
    deckId: word.deckId,
    courseTitle,
    term: word.term,
    kana: word.kana,
    romaji: word.romaji,
    type: word.type,
    meaning: word.meaning,
    example: word.example,
    exampleVi: word.exampleVi,
    savedAt: new Date().toISOString(),
  };
}
