export type KanaScript = "hiragana" | "katakana";

export type KanaCharacter = { kana: string; romaji: string; group: string };

const ROMAJI_GROUPS = [
  ["a", "i", "u", "e", "o"], ["ka", "ki", "ku", "ke", "ko"],
  ["sa", "shi", "su", "se", "so"], ["ta", "chi", "tsu", "te", "to"],
  ["na", "ni", "nu", "ne", "no"], ["ha", "hi", "fu", "he", "ho"],
  ["ma", "mi", "mu", "me", "mo"], ["ya", "yu", "yo"],
  ["ra", "ri", "ru", "re", "ro"], ["wa", "wo", "n"],
] as const;

const HIRAGANA_GROUPS = [
  ["あ", "い", "う", "え", "お"], ["か", "き", "く", "け", "こ"],
  ["さ", "し", "す", "せ", "そ"], ["た", "ち", "つ", "て", "と"],
  ["な", "に", "ぬ", "ね", "の"], ["は", "ひ", "ふ", "へ", "ほ"],
  ["ま", "み", "む", "め", "も"], ["や", "ゆ", "よ"],
  ["ら", "り", "る", "れ", "ろ"], ["わ", "を", "ん"],
] as const;

const KATAKANA_GROUPS = [
  ["ア", "イ", "ウ", "エ", "オ"], ["カ", "キ", "ク", "ケ", "コ"],
  ["サ", "シ", "ス", "セ", "ソ"], ["タ", "チ", "ツ", "テ", "ト"],
  ["ナ", "ニ", "ヌ", "ネ", "ノ"], ["ハ", "ヒ", "フ", "ヘ", "ホ"],
  ["マ", "ミ", "ム", "メ", "モ"], ["ヤ", "ユ", "ヨ"],
  ["ラ", "リ", "ル", "レ", "ロ"], ["ワ", "ヲ", "ン"],
] as const;

export const KANA_GROUP_LABELS = [
  "Nguyên âm", "Hàng K", "Hàng S", "Hàng T", "Hàng N",
  "Hàng H", "Hàng M", "Hàng Y", "Hàng R", "Hàng W + N",
] as const;

export function getKanaCharacters(script: KanaScript): KanaCharacter[] {
  const kanaGroups = script === "hiragana" ? HIRAGANA_GROUPS : KATAKANA_GROUPS;
  return kanaGroups.flatMap((group, groupIndex) =>
    group.map((kana, index) => ({
      kana,
      romaji: ROMAJI_GROUPS[groupIndex][index],
      group: KANA_GROUP_LABELS[groupIndex],
    })),
  );
}

export function isKanaScript(value: string): value is KanaScript {
  return value === "hiragana" || value === "katakana";
}
