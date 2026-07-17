import {
  FiBookOpen,
  FiEdit3,
  FiFeather,
  FiGrid,
  FiLayers,
  FiPlus,
  FiTarget,
} from "react-icons/fi";
import type { Deck, Screen, StudyModeItem, Word } from "./types";

export const words: Word[] = [
  {
    term: "勉強",
    kana: "べんきょう",
    romaji: "benkyou",
    type: "n / suru-v",
    meaning: "học tập",
    wrong: ["nghỉ ngơi", "đọc sách", "làm việc"],
    example: "毎日、日本語を勉強しています。",
    exampleVi: "Mỗi ngày tôi đều học tiếng Nhật.",
    tags: ["N5", "daily"],
  },
  {
    term: "習慣",
    kana: "しゅうかん",
    romaji: "shuukan",
    type: "n",
    meaning: "thói quen",
    wrong: ["tuần lễ", "khoảnh khắc", "kế hoạch"],
    example: "朝早く起きる習慣があります。",
    exampleVi: "Tôi có thói quen dậy sớm.",
    tags: ["N4", "life"],
  },
  {
    term: "忘れる",
    kana: "わすれる",
    romaji: "wasureru",
    type: "v",
    meaning: "quên",
    wrong: ["nhớ", "đợi", "mượn"],
    example: "宿題を忘れないでください。",
    exampleVi: "Đừng quên bài tập nhé.",
    tags: ["N5", "verb"],
  },
  {
    term: "目標",
    kana: "もくひょう",
    romaji: "mokuhyou",
    type: "n",
    meaning: "mục tiêu",
    wrong: ["kết quả", "bài kiểm tra", "cơ hội"],
    example: "今年の目標はN4に合格することです。",
    exampleVi: "Mục tiêu năm nay là đỗ N4.",
    tags: ["N4", "study"],
  },
];

export const decks: Deck[] = [
  { title: "JLPT N5 Foundation", total: 914, newWords: 913, review: 1, accent: "red", tags: ["Kana", "N5", "Cơ bản"] },
  { title: "Kanji N5 thường gặp", total: 120, newWords: 86, review: 12, accent: "green", tags: ["Kanji", "N5"] },
  { title: "Kaiwa hằng ngày", total: 220, newWords: 188, review: 9, accent: "blue", tags: ["Giao tiếp"] },
  { title: "Từ vựng IT Nhật", total: 180, newWords: 142, review: 4, accent: "violet", tags: ["IT", "Business"] },
  { title: "Ngữ pháp N4 ví dụ", total: 96, newWords: 71, review: 8, accent: "amber", tags: ["Grammar", "N4"] },
];

export const modes: StudyModeItem[] = [
  { id: "flashcard", title: "Flashcard", subtitle: "L\u1eadt th\u1ebb nh\u1edb", icon: FiLayers },
  { id: "meaning", title: "Ch\u1ecdn ngh\u0129a", subtitle: "Nh\u1eadt sang Vi\u1ec7t", icon: FiTarget },
  { id: "typing", title: "G\u00f5 t\u1eeb", subtitle: "Vi\u1ec7t sang Nh\u1eadt", icon: FiEdit3 },
  { id: "example", title: "\u0110\u1eb7t c\u00e2u", subtitle: "T\u1ef1 vi\u1ebft v\u00ed d\u1ee5", icon: FiFeather },
];

export const navItems: Array<{ screen: Screen; label: string; icon: typeof FiBookOpen }> = [
  { screen: "library", label: "Thư viện", icon: FiBookOpen },
  { screen: "add", label: "Thêm từ", icon: FiPlus },
  { screen: "study", label: "Luyện tập", icon: FiTarget },
  { screen: "manage", label: "Danh sách", icon: FiGrid },
];
