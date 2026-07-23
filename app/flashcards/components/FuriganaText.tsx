import type { ComponentPropsWithoutRef, ElementType } from "react";

const kanjiPattern = /\p{Script=Han}/u;

export function FuriganaText<T extends ElementType = "span">({
  as,
  text,
  reading,
  ...props
}: Readonly<{
  as?: T;
  text: string;
  reading?: string;
}> & Omit<ComponentPropsWithoutRef<T>, "as" | "children">) {
  const Component = as || "span";
  const hiragana = toHiragana(cleanReading(reading || ""));

  if (!kanjiPattern.test(text) || !hiragana) {
    return <Component {...props} lang="ja">{text}</Component>;
  }

  return (
    <Component {...props} lang="ja">
      <ruby>
        {text}
        <rp>（</rp>
        <rt className="select-none text-[0.42em] font-bold leading-none text-slate-500">{hiragana}</rt>
        <rp>）</rp>
      </ruby>
    </Component>
  );
}

function cleanReading(value: string) {
  return value
    .split(/[／/|]/)[0]
    .replace(/\[[^\]]*\]/g, "")
    .replace(/[～~]/g, "")
    .trim();
}

function toHiragana(value: string) {
  return value.replace(/[ァ-ヶ]/g, (character) =>
    String.fromCharCode(character.charCodeAt(0) - 0x60),
  );
}
