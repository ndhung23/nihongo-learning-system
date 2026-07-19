"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type AppLocale = "vi" | "en";

const STORAGE_KEY = "nihongo-language";

const messages = {
  vi: {
    searchCourses: "Tìm tên khóa học...",
    home: "Trang chủ",
    discover: "Khám phá",
    bookmarks: "Bookmark của tôi",
    myVocabulary: "Từ vựng riêng tôi",
    profile: "Hồ sơ cá nhân",
    admin: "Quản trị hệ thống",
    logout: "Đăng xuất",
    login: "Đăng nhập",
    lightTheme: "Đổi sang giao diện sáng",
    darkTheme: "Đổi sang giao diện tối",
    feedback: "Gửi góp ý",
    library: "Thư viện",
    addWord: "Thêm từ",
    practice: "Luyện tập",
    list: "Danh sách",
    coinShop: "Cửa hàng xu",
    todayStreak: "Streak hôm nay",
    streakDescription: "Giữ 12 ngày liên tiếp. Hoàn thành 10 từ nữa để nhận thêm điểm nước.",
    totalWords: "Tổng từ",
    wordsToLearn: "Cần học",
    wordsToReview: "Cần ôn",
    currentWord: "Từ đang học",
    viewVocabulary: "Xem từ vựng",
    meaningMode: "Chọn nghĩa",
    meaningModeHint: "Nhật sang Việt",
    typingMode: "Gõ từ",
    typingModeHint: "Việt sang Nhật",
    sentenceMode: "Đặt câu",
    sentenceModeHint: "Tự viết ví dụ",
    flashcardHint: "Lật thẻ nhớ",
    vietnameseMeaning: "Nghĩa tiếng Việt",
    close: "Đóng",
    language: "Ngôn ngữ",
    newWord: "Từ mới",
    tapToFlip: "Bấm để lật",
    front: "Mặt trước",
    back: "Mặt sau",
    tapToReturn: "Bấm để quay lại",
    meaning: "Nghĩa",
    known: "Đã thuộc",
    listen: "Nghe",
    continue: "Tiếp tục",
    bookmarkWord: "Bookmark từ",
    bookmarked: "Đã bookmark",
    learnWithAi: "Học sâu hơn với AI",
  },
  en: {
    searchCourses: "Search courses...",
    home: "Home",
    discover: "Discover",
    bookmarks: "My bookmarks",
    myVocabulary: "My vocabulary",
    profile: "My profile",
    admin: "System administration",
    logout: "Log out",
    login: "Log in",
    lightTheme: "Switch to light mode",
    darkTheme: "Switch to dark mode",
    feedback: "Send feedback",
    library: "Library",
    addWord: "Add words",
    practice: "Practice",
    list: "Word lists",
    coinShop: "Coin shop",
    todayStreak: "Today's streak",
    streakDescription: "Keep your 12-day streak. Complete 10 more words to earn bonus points.",
    totalWords: "Total words",
    wordsToLearn: "To learn",
    wordsToReview: "To review",
    currentWord: "Current word",
    viewVocabulary: "View vocabulary",
    meaningMode: "Choose meaning",
    meaningModeHint: "Japanese to Vietnamese",
    typingMode: "Type the word",
    typingModeHint: "Vietnamese to Japanese",
    sentenceMode: "Make a sentence",
    sentenceModeHint: "Write your own example",
    flashcardHint: "Flip and remember",
    vietnameseMeaning: "Vietnamese meaning",
    close: "Close",
    language: "Language",
    newWord: "New word",
    tapToFlip: "Tap to flip",
    front: "Front",
    back: "Back",
    tapToReturn: "Tap to return",
    meaning: "Meaning",
    known: "I know this",
    listen: "Listen",
    continue: "Continue",
    bookmarkWord: "Bookmark word",
    bookmarked: "Bookmarked",
    learnWithAi: "Learn more with AI",
  },
} as const;

export type MessageKey = keyof typeof messages.vi;

type LanguageContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (key: MessageKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [locale, setLocaleState] = useState<AppLocale>("vi");

  useEffect(() => {
    const savedLocale = window.localStorage.getItem(STORAGE_KEY);
    const browserLocale = window.navigator.language.toLowerCase().startsWith("en") ? "en" : "vi";
    const initialLocale = savedLocale === "en" || savedLocale === "vi" ? savedLocale : browserLocale;
    queueMicrotask(() => setLocaleState(initialLocale));
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<LanguageContextValue>(() => ({
    locale,
    setLocale(nextLocale) {
      window.localStorage.setItem(STORAGE_KEY, nextLocale);
      setLocaleState(nextLocale);
    },
    t(key) {
      return messages[locale][key];
    },
  }), [locale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider.");
  }

  return context;
}
