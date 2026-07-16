"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { words } from "../data";
import { StudyScreen } from "../screens/StudyScreen";
import type { AnswerState, StudyMode } from "../types";

export function StudyClient({ initialMode }: Readonly<{ initialMode: StudyMode }>) {
  const router = useRouter();
  const [mode, setMode] = useState<StudyMode>(initialMode);
  const [wordIndex, setWordIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
  const [flipped, setFlipped] = useState(false);

  const currentWord = words[wordIndex];
  const answers = useMemo(
    () => [currentWord.meaning, ...currentWord.wrong].sort((a, b) => a.localeCompare(b)),
    [currentWord],
  );

  function resetPractice() {
    setSelectedAnswer("");
    setAnswerState("idle");
    setFlipped(false);
  }

  function nextWord() {
    setWordIndex((index) => (index + 1) % words.length);
    resetPractice();
  }

  function chooseAnswer(answer: string) {
    setSelectedAnswer(answer);
    setAnswerState(answer === currentWord.meaning ? "correct" : "wrong");
  }

  function changeMode(nextMode: StudyMode) {
    setMode(nextMode);
    resetPractice();
    router.replace(`/flashcards/study?mode=${nextMode}`, { scroll: false });
  }

  return (
    <StudyScreen
      answerState={answerState}
      answers={answers}
      currentWord={currentWord}
      flipped={flipped}
      mode={mode}
      onBack={() => router.push("/flashcards")}
      onChoose={chooseAnswer}
      onFlip={() => setFlipped((value) => !value)}
      onModeChange={changeMode}
      onNext={nextWord}
      selectedAnswer={selectedAnswer}
    />
  );
}
