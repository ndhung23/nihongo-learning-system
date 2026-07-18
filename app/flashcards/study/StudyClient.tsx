"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { words } from "../data";
import { getWordBookmarkKey, readVocabularyBookmarks, toVocabularyBookmark, writeVocabularyBookmarks } from "../bookmarkStorage";
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
  _id?: string;
  deckId?: string;
  term: string;
  kana?: string;
  romaji?: string;
  meaningVi: string;
  partOfSpeech?: string;
  level?: "kana" | "n5" | "n4" | "n3" | "n2" | "n1" | "custom";
  lesson?: number;
  examples?: Array<{
    ja?: string;
    vi?: string;
  }>;
};

type DailyState = {
  date: string;
  totalXp: number;
  dailyXp: number;
  streak: number;
  checkedIn: boolean;
  sessions: number;
  correctAnswers: number;
  newWords: number;
  claimedQuests: string[];
};

const dailyStorageKey = "nihongo-daily-progress";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function readDailyState(): DailyState {
  const fallback: DailyState = {
    date: todayKey(),
    totalXp: 0,
    dailyXp: 0,
    streak: 0,
    checkedIn: false,
    sessions: 0,
    correctAnswers: 0,
    newWords: 0,
    claimedQuests: [],
  };
  const raw = window.localStorage.getItem(dailyStorageKey);

  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as DailyState;

    if (parsed.date !== todayKey()) {
      return {
        ...fallback,
        totalXp: parsed.totalXp || 0,
        streak: parsed.streak || 0,
      };
    }

    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

function addDailyProgress(progress: Partial<Pick<DailyState, "sessions" | "correctAnswers" | "newWords">> & { xp?: number }) {
  const current = readDailyState();
  const nextState: DailyState = {
    ...current,
    sessions: current.sessions + (progress.sessions || 0),
    correctAnswers: current.correctAnswers + (progress.correctAnswers || 0),
    newWords: current.newWords + (progress.newWords || 0),
    dailyXp: current.dailyXp + (progress.xp || 0),
    totalXp: current.totalXp + (progress.xp || 0),
  };

  window.localStorage.setItem(dailyStorageKey, JSON.stringify(nextState));
  window.dispatchEvent(new CustomEvent("nihongo-daily-progress-updated"));
}

export function StudyClient({
  initialDeckId,
  initialLesson,
  initialMode,
}: Readonly<{ initialDeckId?: string; initialLesson?: string; initialMode: StudyMode }>) {
  const router = useRouter();
  const [deckId, setDeckId] = useState(initialDeckId || "");
  const [lesson, setLesson] = useState(initialLesson || "all");
  const [courseTitle, setCourseTitle] = useState(initialDeckId ? "Đang tải khóa học" : "JLPT N5");
  const [courseTotal, setCourseTotal] = useState<number | null>(null);
  const [studyWords, setStudyWords] = useState<Word[]>(initialDeckId ? [] : words);
  const [isCourseLoading, setIsCourseLoading] = useState(Boolean(initialDeckId));
  const [mode, setMode] = useState<StudyMode>(initialMode);
  const [wordIndex, setWordIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
  const [flipped, setFlipped] = useState(false);
  const [typingAnswer, setTypingAnswer] = useState("");
  const [typingState, setTypingState] = useState<AnswerState>("idle");
  const [vocabularyOpen, setVocabularyOpen] = useState(false);
  const [vocabularyQuery, setVocabularyQuery] = useState("");
  const [bookmarkedKeys, setBookmarkedKeys] = useState<string[]>([]);
  const loadedDeckId = useRef("");

  useEffect(() => {
    const savedDeckId = window.localStorage.getItem("selectedCourseId");
    const nextDeckId = initialDeckId || savedDeckId || "";
    const nextLesson = initialLesson || "all";

    if (!nextDeckId) {
      return;
    }

    const loadKey = `${nextDeckId}:${nextLesson}`;

    if (loadedDeckId.current === loadKey) {
      return;
    }

    loadedDeckId.current = loadKey;
    setDeckId(nextDeckId);
    setLesson(nextLesson);
    setIsCourseLoading(true);
    setStudyWords([]);
    setCourseTitle("Đang tải khóa học");
    setCourseTotal(null);

    if (!initialDeckId) {
      router.replace(buildStudyUrl(initialMode, nextDeckId, nextLesson), { scroll: false });
    }

    Promise.all([
      fetch(`/api/vocabulary?deckId=${nextDeckId}&limit=1500${nextLesson !== "all" ? `&lesson=${nextLesson}` : ""}`).then((response) => (response.ok ? response.json() : { data: [] })),
      fetch("/api/courses?limit=80").then((response) => (response.ok ? response.json() : { data: [] })),
    ])
      .then(([vocabularyPayload, coursesPayload]: [{ data?: VocabularyItem[] }, { data?: Course[] }]) => {
        const vocabulary = vocabularyPayload.data || [];
        const meaningPool = [...new Set(vocabulary.map((item) => item.meaningVi).filter(Boolean))];
        const meaningIndexes = new Map(meaningPool.map((meaning, index) => [meaning, index]));
        const mappedWords = vocabulary.map((item) => toStudyWord(item, meaningPool, meaningIndexes));
        const selectedCourse = (coursesPayload.data || []).find((course) => course.id === nextDeckId);

        if (selectedCourse) {
          setCourseTitle(nextLesson !== "all" ? `${selectedCourse.title} - Bài ${nextLesson}` : selectedCourse.title);
          setCourseTotal(nextLesson !== "all" ? mappedWords.length : selectedCourse.stats?.vocabularyCount || mappedWords.length);
        } else {
          setCourseTitle("Khóa học đã chọn");
          setCourseTotal(mappedWords.length);
        }

        setStudyWords(mappedWords);
        setWordIndex(0);
        resetPractice();
      })
      .catch(() => {
        setCourseTitle("Không tải được khóa học");
        setCourseTotal(0);
        setStudyWords([]);
      })
      .finally(() => {
        setIsCourseLoading(false);
      });
  }, [initialDeckId, initialLesson, initialMode, router]);

  useEffect(() => {
    const syncBookmarks = () => {
      setBookmarkedKeys(readVocabularyBookmarks().map((bookmark) => bookmark.key));
    };

    syncBookmarks();
    window.addEventListener("nihongo-vocabulary-bookmarks-updated", syncBookmarks);
    window.addEventListener("storage", syncBookmarks);

    return () => {
      window.removeEventListener("nihongo-vocabulary-bookmarks-updated", syncBookmarks);
      window.removeEventListener("storage", syncBookmarks);
    };
  }, []);

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
    router.replace(buildStudyUrl("flashcard", deckId, lesson), { scroll: false });
  }

  function finishWord() {
    addDailyProgress({ sessions: 1, newWords: 1, xp: 10 });
    nextWord();
  }

  function markKnown() {
    addDailyProgress({ newWords: 1, xp: 5 });
    nextWord();
  }

  function chooseAnswer(answer: string) {
    setSelectedAnswer(answer);
    const isCorrect = answer === currentWord.meaning;
    setAnswerState(isCorrect ? "correct" : "wrong");

    if (isCorrect && answerState === "idle") {
      addDailyProgress({ correctAnswers: 1, xp: 2 });
    }
  }

  function continueFlashcard() {
    setMode("meaning");
    resetPractice();
    router.replace(buildStudyUrl("meaning", deckId, lesson), { scroll: false });
  }

  function continueMeaning() {
    setMode("typing");
    resetPractice();
    router.replace(buildStudyUrl("typing", deckId, lesson), { scroll: false });
  }

  function submitTyping() {
    const isCorrect = isTypingCorrect(typingAnswer, currentWord);
    setTypingState(isCorrect ? "correct" : "wrong");

    if (isCorrect) {
      addDailyProgress({ correctAnswers: 1, xp: 2 });
      setMode("example");
      setTypingAnswer("");
      setAnswerState("idle");
      setFlipped(false);
      router.replace(buildStudyUrl("example", deckId, lesson), { scroll: false });
    }
  }

  function changeMode(nextMode: StudyMode) {
    setMode(nextMode);
    resetPractice();
    router.replace(buildStudyUrl(nextMode, deckId, lesson), { scroll: false });
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

  function toggleBookmark(word: Word) {
    const key = getWordBookmarkKey(word);
    const bookmarks = readVocabularyBookmarks();
    const exists = bookmarks.some((bookmark) => bookmark.key === key);
    const nextBookmarks = exists
      ? bookmarks.filter((bookmark) => bookmark.key !== key)
      : [toVocabularyBookmark(word, courseTitle), ...bookmarks.filter((bookmark) => bookmark.key !== key)];

    writeVocabularyBookmarks(nextBookmarks);
    setBookmarkedKeys(nextBookmarks.map((bookmark) => bookmark.key));
  }

  return (
    <StudyScreen
      answerState={answerState}
      answers={answers}
      currentWord={currentWord}
      flipped={flipped}
      isLoading={isCourseLoading}
      mode={mode}
      stats={{
        newWords: Math.max((courseTotal || studyWords.length) - 1, 0),
        review: 1,
        total: courseTotal || studyWords.length,
      }}
      title={courseTitle}
      vocabularyOpen={vocabularyOpen}
      vocabularyQuery={vocabularyQuery}
      bookmarkedKeys={bookmarkedKeys}
      words={studyWords}
      onBack={() => router.push("/flashcards")}
      onChoose={chooseAnswer}
      onCloseVocabulary={() => setVocabularyOpen(false)}
      onContinueFlashcard={continueFlashcard}
      onContinueMeaning={continueMeaning}
      onFlip={() => setFlipped((value) => !value)}
      onModeChange={changeMode}
      onNext={finishWord}
      onOpenVocabulary={() => setVocabularyOpen(true)}
      onSpeak={speakJapanese}
      onSkipWord={markKnown}
      onTypingAnswerChange={(value) => {
        setTypingAnswer(value);
        setTypingState("idle");
      }}
      onTypingSubmit={submitTyping}
      onToggleBookmark={toggleBookmark}
      onVocabularyQueryChange={setVocabularyQuery}
      selectedAnswer={selectedAnswer}
      typingAnswer={typingAnswer}
      typingState={typingState}
    />
  );
}

function buildStudyUrl(mode: StudyMode, deckId: string, lesson: string) {
  const params = new URLSearchParams({ mode });

  if (deckId) {
    params.set("deckId", deckId);
  }

  if (lesson && lesson !== "all") {
    params.set("lesson", lesson);
  }

  return `/flashcards/study?${params.toString()}`;
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

function toStudyWord(item: VocabularyItem, meaningPool: string[], meaningIndexes: Map<string, number>): Word {
  const meaning = item.meaningVi || item.partOfSpeech || item.term;
  const kana = item.kana || "";
  const romaji = item.romaji || kanaToRomaji(kana);
  const wrong: string[] = [];
  const startIndex = meaningIndexes.get(meaning) ?? 0;

  for (let offset = 1; offset < meaningPool.length && wrong.length < 3; offset += 1) {
    const candidate = meaningPool[(startIndex + offset) % meaningPool.length];

    if (candidate !== meaning) {
      wrong.push(candidate);
    }
  }

  const grammarExample = buildGrammarExample(item.term, meaning, item.level, item.lesson);
  const example = item.examples?.find((entry) => entry.ja)?.ja || grammarExample.ja;
  const exampleVi = item.examples?.find((entry) => entry.vi)?.vi || grammarExample.vi;

  return {
    id: item._id,
    deckId: item.deckId,
    term: item.term,
    kana,
    romaji,
    type: item.partOfSpeech || "IT",
    meaning,
    wrong,
    example,
    exampleVi,
    tags: ["IT"],
  };
}

function buildGrammarExample(term: string, meaning: string, level?: VocabularyItem["level"], lesson?: number) {
  const lessonNumber = lesson || 1;
  const quotedTerm = `\u300c${term}\u300d`;

  if (level === "n4") {
    const n4Examples = [
      {
        minLesson: 45,
        ja: `${quotedTerm}\u306b\u3064\u3044\u3066\u8abf\u3079\u3066\u307f\u305f\u3089\u3001\u601d\u3063\u305f\u3088\u308a\u899a\u3048\u3084\u3059\u304b\u3063\u305f\u3067\u3059\u3002`,
        vi: `Sau khi thử tìm hiểu về "${meaning}", nó dễ nhớ hơn tôi nghĩ. (N4: について, てみたら, より)`,
      },
      {
        minLesson: 42,
        ja: `${quotedTerm}\u3092\u4f7f\u3044\u3053\u306a\u305b\u308b\u3088\u3046\u306b\u3001\u4f8b\u6587\u3092\u4f5c\u3063\u3066\u304a\u304d\u307e\u3059\u3002`,
        vi: `Để có thể dùng tốt "${meaning}", tôi sẽ chuẩn bị sẵn câu ví dụ. (N4: ように, ておきます)`,
      },
      {
        minLesson: 38,
        ja: `${quotedTerm}\u306e\u4f7f\u3044\u65b9\u3092\u5fd8\u308c\u306a\u3044\u3088\u3046\u306b\u3001\u30ce\u30fc\u30c8\u306b\u66f8\u3044\u3066\u304a\u304d\u307e\u3059\u3002`,
        vi: `Để không quên cách dùng "${meaning}", tôi ghi sẵn vào vở. (N4: ように, ておきます)`,
      },
      {
        minLesson: 34,
        ja: `${quotedTerm}\u306f\u4f1a\u8a71\u3067\u3088\u304f\u4f7f\u308f\u308c\u308b\u306e\u3067\u3001\u4f8b\u6587\u3067\u78ba\u304b\u3081\u3066\u304b\u3089\u899a\u3048\u307e\u3059\u3002`,
        vi: `Vì "${meaning}" thường được dùng trong hội thoại, tôi kiểm tra bằng câu ví dụ rồi mới học. (N4: 受身, ので, てから)`,
      },
      {
        minLesson: 30,
        ja: `${quotedTerm}\u3092\u4f7f\u3048\u3070\u3001\u8a00\u3044\u305f\u3044\u3053\u3068\u304c\u3082\u3063\u3068\u81ea\u7136\u306b\u4f1d\u308f\u308a\u307e\u3059\u3002`,
        vi: `Nếu dùng "${meaning}", điều muốn nói sẽ được truyền đạt tự nhiên hơn. (N4: ば, たいこと)`,
      },
      {
        minLesson: 26,
        ja: `${quotedTerm}\u3092\u4f7f\u3063\u305f\u3093\u3067\u3059\u304c\u3001\u3053\u306e\u6587\u306f\u81ea\u7136\u3067\u3059\u304b\u3002`,
        vi: `Tôi đã dùng "${meaning}", câu này có tự nhiên không? (N4: んですが)`,
      },
    ];

    return pickGrammarExample(n4Examples, lessonNumber);
  }

  if (level === "n5") {
    const n5Examples = [
      {
        minLesson: 21,
        ja: `${quotedTerm}\u306f\u5927\u5207\u3060\u3068\u601d\u3044\u307e\u3059\u304b\u3089\u3001\u6bce\u65e5\u5c11\u3057\u305a\u3064\u899a\u3048\u3066\u3044\u307e\u3059\u3002`,
        vi: `Vì tôi nghĩ "${meaning}" quan trọng nên mỗi ngày tôi học từng chút một. (N5: と思います, から, ています)`,
      },
      {
        minLesson: 18,
        ja: `${quotedTerm}\u3092\u4f7f\u3046\u3053\u3068\u304c\u3067\u304d\u308b\u3088\u3046\u306b\u3001\u4f8b\u6587\u3092\u4f55\u56de\u3082\u8aad\u307f\u307e\u3059\u3002`,
        vi: `Để có thể dùng "${meaning}", tôi đọc câu ví dụ nhiều lần. (N5: ことができます, ように)`,
      },
      {
        minLesson: 15,
        ja: `${quotedTerm}\u3092\u898b\u3066\u304b\u3089\u3001\u8f9e\u66f8\u3067\u610f\u5473\u3092\u8abf\u3079\u3066\u3082\u3044\u3044\u3067\u3059\u304b\u3002`,
        vi: `Sau khi nhìn thấy "${meaning}", tôi tra nghĩa bằng từ điển được không? (N5: てから, てもいいですか)`,
      },
      {
        minLesson: 10,
        ja: `${quotedTerm}\u306f\u6559\u79d1\u66f8\u306e\u4e2d\u306b\u3042\u308a\u307e\u3059\u304c\u3001\u307e\u3060\u3088\u304f\u308f\u304b\u308a\u307e\u305b\u3093\u3002`,
        vi: `"${meaning}" có trong sách giáo khoa nhưng tôi vẫn chưa hiểu rõ. (N5: にあります, が, まだ)`,
      },
      {
        minLesson: 6,
        ja: `${quotedTerm}\u3092\u4f7f\u3063\u3066\u3001\u65e5\u672c\u8a9e\u306e\u77ed\u3044\u6587\u3092\u4f5c\u308a\u307e\u3059\u3002`,
        vi: `Tôi dùng "${meaning}" để đặt một câu tiếng Nhật ngắn. (N5: を, て形)`,
      },
      {
        minLesson: 1,
        ja: `${quotedTerm}\u306f\u65e5\u672c\u8a9e\u306e\u8a00\u8449\u3067\u3059\u3002\u30d9\u30c8\u30ca\u30e0\u8a9e\u3067\u300c${meaning}\u300d\u3067\u3059\u3002`,
        vi: `"${term}" là một từ tiếng Nhật. Trong tiếng Việt là "${meaning}". (N5: は, です, で)`,
      },
    ];

    return pickGrammarExample(n5Examples, lessonNumber);
  }

  return {
    ja: `${quotedTerm}\u3092\u4f7f\u3063\u3066\u3001\u77ed\u3044\u6587\u3092\u4f5c\u308a\u307e\u3059\u3002`,
    vi: `Tôi dùng "${meaning}" để đặt một câu ngắn.`,
  };
}

function pickGrammarExample<T extends { minLesson: number; ja: string; vi: string }>(examples: T[], lessonNumber: number) {
  return examples.find((example) => lessonNumber >= example.minLesson) || examples[examples.length - 1];
}

function kanaToRomaji(value: string) {
  const kana = toHiragana(value)
    .normalize("NFKC")
    .replace(/[~\uff5e]/g, "")
    .replace(/\[[^\]]*\]/g, "");
  const digraphs: Record<string, string> = {
    "\u304d\u3083": "kya",
    "\u304d\u3085": "kyu",
    "\u304d\u3087": "kyo",
    "\u304e\u3083": "gya",
    "\u304e\u3085": "gyu",
    "\u304e\u3087": "gyo",
    "\u3057\u3083": "sha",
    "\u3057\u3085": "shu",
    "\u3057\u3087": "sho",
    "\u3058\u3083": "ja",
    "\u3058\u3085": "ju",
    "\u3058\u3087": "jo",
    "\u3061\u3083": "cha",
    "\u3061\u3085": "chu",
    "\u3061\u3087": "cho",
    "\u306b\u3083": "nya",
    "\u306b\u3085": "nyu",
    "\u306b\u3087": "nyo",
    "\u3072\u3083": "hya",
    "\u3072\u3085": "hyu",
    "\u3072\u3087": "hyo",
    "\u3073\u3083": "bya",
    "\u3073\u3085": "byu",
    "\u3073\u3087": "byo",
    "\u3074\u3083": "pya",
    "\u3074\u3085": "pyu",
    "\u3074\u3087": "pyo",
    "\u307f\u3083": "mya",
    "\u307f\u3085": "myu",
    "\u307f\u3087": "myo",
    "\u308a\u3083": "rya",
    "\u308a\u3085": "ryu",
    "\u308a\u3087": "ryo",
  };
  const singles: Record<string, string> = {
    "\u3042": "a",
    "\u3044": "i",
    "\u3046": "u",
    "\u3048": "e",
    "\u304a": "o",
    "\u304b": "ka",
    "\u304d": "ki",
    "\u304f": "ku",
    "\u3051": "ke",
    "\u3053": "ko",
    "\u304c": "ga",
    "\u304e": "gi",
    "\u3050": "gu",
    "\u3052": "ge",
    "\u3054": "go",
    "\u3055": "sa",
    "\u3057": "shi",
    "\u3059": "su",
    "\u305b": "se",
    "\u305d": "so",
    "\u3056": "za",
    "\u3058": "ji",
    "\u305a": "zu",
    "\u305c": "ze",
    "\u305e": "zo",
    "\u305f": "ta",
    "\u3061": "chi",
    "\u3064": "tsu",
    "\u3066": "te",
    "\u3068": "to",
    "\u3060": "da",
    "\u3062": "ji",
    "\u3065": "zu",
    "\u3067": "de",
    "\u3069": "do",
    "\u306a": "na",
    "\u306b": "ni",
    "\u306c": "nu",
    "\u306d": "ne",
    "\u306e": "no",
    "\u306f": "ha",
    "\u3072": "hi",
    "\u3075": "fu",
    "\u3078": "he",
    "\u307b": "ho",
    "\u3070": "ba",
    "\u3073": "bi",
    "\u3076": "bu",
    "\u3079": "be",
    "\u307c": "bo",
    "\u3071": "pa",
    "\u3074": "pi",
    "\u3077": "pu",
    "\u307a": "pe",
    "\u307d": "po",
    "\u307e": "ma",
    "\u307f": "mi",
    "\u3080": "mu",
    "\u3081": "me",
    "\u3082": "mo",
    "\u3084": "ya",
    "\u3086": "yu",
    "\u3088": "yo",
    "\u3089": "ra",
    "\u308a": "ri",
    "\u308b": "ru",
    "\u308c": "re",
    "\u308d": "ro",
    "\u308f": "wa",
    "\u3092": "o",
    "\u3093": "n",
    "\u30fc": "-",
  };
  let result = "";
  let doubleNext = false;

  for (let index = 0; index < kana.length; index += 1) {
    const character = kana[index];

    if (character === "\u3063") {
      doubleNext = true;
      continue;
    }

    const pair = kana.slice(index, index + 2);
    let romaji = digraphs[pair];

    if (romaji) {
      index += 1;
    } else {
      romaji = singles[character] || "";
    }

    if (!romaji) {
      continue;
    }

    if (doubleNext) {
      result += romaji[0];
      doubleNext = false;
    }

    result += romaji;
  }

  return result;
}
