"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { words } from "../data";
import { StudyScreen } from "../screens/StudyScreen";
import type { AnswerState, StudyMode, Word } from "../types";

type Course = {
  id: string;
  title: string;
  stats?: {
    vocabularyCount?: number;
  };
};

type VocabularyItem = {
  term: string;
  kana?: string;
  romaji?: string;
  meaningVi: string;
  partOfSpeech?: string;
  examples?: Array<{
    ja?: string;
    vi?: string;
  }>;
};

export function StudyClient({ initialDeckId, initialMode }: Readonly<{ initialDeckId?: string; initialMode: StudyMode }>) {
  const router = useRouter();
  const [deckId, setDeckId] = useState(initialDeckId || "");
  const [courseTitle, setCourseTitle] = useState(initialDeckId ? "Khóa học đã chọn" : "JLPT N5");
  const [courseTotal, setCourseTotal] = useState<number | null>(null);
  const [studyWords, setStudyWords] = useState<Word[]>(words);
  const [mode, setMode] = useState<StudyMode>(initialMode);
  const [wordIndex, setWordIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
  const [flipped, setFlipped] = useState(false);
  const [typingAnswer, setTypingAnswer] = useState("");
  const [typingState, setTypingState] = useState<AnswerState>("idle");
  const [vocabularyOpen, setVocabularyOpen] = useState(false);
  const [vocabularyQuery, setVocabularyQuery] = useState("");
  const loadedDeckId = useRef("");

  useEffect(() => {
    const savedDeckId = window.localStorage.getItem("selectedCourseId");
    const nextDeckId = initialDeckId || savedDeckId || "";

    if (!nextDeckId) {
      return;
    }

    if (loadedDeckId.current === nextDeckId) {
      return;
    }

    loadedDeckId.current = nextDeckId;
    setDeckId(nextDeckId);

    if (!initialDeckId) {
      router.replace(`/flashcards/study?mode=${initialMode}&deckId=${nextDeckId}`, { scroll: false });
    }

    Promise.all([
      fetch(`/api/vocabulary?deckId=${nextDeckId}&limit=1500`, { cache: "no-store" }).then((response) => (response.ok ? response.json() : { data: [] })),
      fetch("/api/courses", { cache: "no-store" }).then((response) => (response.ok ? response.json() : { data: [] })),
    ])
      .then(([vocabularyPayload, coursesPayload]: [{ data?: VocabularyItem[] }, { data?: Course[] }]) => {
        const vocabulary = vocabularyPayload.data || [];
        const mappedWords = vocabulary.map((item, index) => toStudyWord(item, vocabulary, index));
        const selectedCourse = (coursesPayload.data || []).find((course) => course.id === nextDeckId);

        if (selectedCourse) {
          setCourseTitle(selectedCourse.title);
          setCourseTotal(selectedCourse.stats?.vocabularyCount || mappedWords.length);
        }

        if (mappedWords.length > 0) {
          setStudyWords(mappedWords);
          setWordIndex(0);
          resetPractice();
        }
      })
      .catch(() => {
        setStudyWords(words);
      });
  }, [initialDeckId, router]);

  const currentWord = studyWords[wordIndex] || words[0];
  const answers = useMemo(
    () => [currentWord.meaning, ...currentWord.wrong].sort((a, b) => a.localeCompare(b)),
    [currentWord],
  );

  function resetPractice() {
    setSelectedAnswer("");
    setAnswerState("idle");
    setFlipped(false);
    setTypingAnswer("");
    setTypingState("idle");
  }

  function nextWord() {
    setWordIndex((index) => (index + 1) % studyWords.length);
    setMode("flashcard");
    resetPractice();
    router.replace(`/flashcards/study?mode=flashcard${deckId ? `&deckId=${deckId}` : ""}`, { scroll: false });
  }

  function chooseAnswer(answer: string) {
    setSelectedAnswer(answer);
    setAnswerState(answer === currentWord.meaning ? "correct" : "wrong");
  }

  function continueFlashcard() {
    setMode("meaning");
    resetPractice();
    router.replace(`/flashcards/study?mode=meaning${deckId ? `&deckId=${deckId}` : ""}`, { scroll: false });
  }

  function continueMeaning() {
    setMode("typing");
    resetPractice();
    router.replace(`/flashcards/study?mode=typing${deckId ? `&deckId=${deckId}` : ""}`, { scroll: false });
  }

  function submitTyping() {
    const isCorrect = isTypingCorrect(typingAnswer, currentWord);
    setTypingState(isCorrect ? "correct" : "wrong");

    if (isCorrect) {
      setMode("example");
      setTypingAnswer("");
      setAnswerState("idle");
      setFlipped(false);
      router.replace(`/flashcards/study?mode=example${deckId ? `&deckId=${deckId}` : ""}`, { scroll: false });
    }
  }

  function changeMode(nextMode: StudyMode) {
    setMode(nextMode);
    resetPractice();
    router.replace(`/flashcards/study?mode=${nextMode}${deckId ? `&deckId=${deckId}` : ""}`, { scroll: false });
  }

  function speakJapanese(text = currentWord.term) {
    if (!("speechSynthesis" in window)) {
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    utterance.rate = 0.86;
    utterance.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const japaneseVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith("ja"));

    if (japaneseVoice) {
      utterance.voice = japaneseVoice;
    }

    window.speechSynthesis.speak(utterance);
  }

  return (
    <StudyScreen
      answerState={answerState}
      answers={answers}
      currentWord={currentWord}
      flipped={flipped}
      mode={mode}
      stats={{
        newWords: Math.max((courseTotal || studyWords.length) - 1, 0),
        review: 1,
        total: courseTotal || studyWords.length,
      }}
      title={courseTitle}
      vocabularyOpen={vocabularyOpen}
      vocabularyQuery={vocabularyQuery}
      words={studyWords}
      onBack={() => router.push("/flashcards")}
      onChoose={chooseAnswer}
      onCloseVocabulary={() => setVocabularyOpen(false)}
      onContinueFlashcard={continueFlashcard}
      onContinueMeaning={continueMeaning}
      onFlip={() => setFlipped((value) => !value)}
      onModeChange={changeMode}
      onNext={nextWord}
      onOpenVocabulary={() => setVocabularyOpen(true)}
      onSpeak={speakJapanese}
      onSkipWord={nextWord}
      onTypingAnswerChange={(value) => {
        setTypingAnswer(value);
        setTypingState("idle");
      }}
      onTypingSubmit={submitTyping}
      onVocabularyQueryChange={setVocabularyQuery}
      selectedAnswer={selectedAnswer}
      typingAnswer={typingAnswer}
      typingState={typingState}
    />
  );
}

function isTypingCorrect(answer: string, word: Word) {
  const normalizedAnswer = normalizeInput(answer);
  const candidates = [word.term, word.kana, word.romaji, toHiragana(word.term), toHiragana(word.kana), toKatakana(word.term), toKatakana(word.kana)]
    .map(normalizeInput)
    .filter(Boolean);

  return candidates.includes(normalizedAnswer);
}

function normalizeInput(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\u30fb\-_/.,\uff0c\u3002]+/g, "")
    .trim();
}

function toHiragana(value: string) {
  return value.replace(/[\u30a1-\u30f6]/g, (character) => String.fromCharCode(character.charCodeAt(0) - 0x60));
}

function toKatakana(value: string) {
  return value.replace(/[\u3041-\u3096]/g, (character) => String.fromCharCode(character.charCodeAt(0) + 0x60));
}

function toStudyWord(item: VocabularyItem, vocabulary: VocabularyItem[], index: number): Word {
  const meaning = item.meaningVi || item.partOfSpeech || item.term;
  const wrong = vocabulary
    .filter((candidate) => candidate.meaningVi && candidate.meaningVi !== meaning)
    .slice(index + 1, index + 4)
    .map((candidate) => candidate.meaningVi);
  const fallbackWrong = vocabulary
    .filter((candidate) => candidate.meaningVi && candidate.meaningVi !== meaning)
    .slice(0, 3)
    .map((candidate) => candidate.meaningVi);
  const example = item.examples?.find((entry) => entry.ja)?.ja || `${item.term}\u3092\u78ba\u8a8d\u3057\u307e\u3059\u3002`;
  const exampleVi = item.examples?.find((entry) => entry.vi)?.vi || `Ghi nh\u1edb ngh\u0129a: ${meaning}.`;

  return {
    term: item.term,
    kana: item.kana || "",
    romaji: item.romaji || "",
    type: item.partOfSpeech || "IT",
    meaning,
    wrong: [...new Set([...wrong, ...fallbackWrong])].slice(0, 3),
    example,
    exampleVi,
    tags: ["IT"],
  };
}
