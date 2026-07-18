import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const highlights = {
  "n5-1-p1-q1": "五百円",
  "n5-1-p1-q2": "読みます",
  "n5-1-p1-q3": "毎日",
  "n5-1-p1-q4": "多い",
  "n5-1-p1-q5": "今朝",
  "n5-1-p1-q6": "風呂",
  "n5-1-p1-q7": "北海道",
  "n5-1-p1-q8": "道",
  "n5-1-p1-q9": "有名",
  "n5-1-p1-q10": "下",
  "n5-1-p1-q11": "可愛い",
  "n5-1-p1-q12": "六日",
  "n5-1-p2-q1": "こんしゅう",
  "n5-1-p2-q2": "でぱあと",
  "n5-1-p2-q3": "しろい",
  "n5-1-p2-q4": "べんきょう",
  "n5-1-p2-q5": "ちいさい",
  "n5-1-p2-q6": "かっこう",
  "n5-1-p2-q7": "つとめて",
  "n5-1-p2-q8": "すみたく",
  "n5-1-p4-q1": "熱心",
  "n5-1-p4-q2": "一円も",
  "n5-1-p4-q3": "げんかんをでました",
  "n5-1-p4-q4": "すずしいかぜをいれましょう",
  "n5-1-p4-q5": "わたしました",
};

const filePath = path.resolve(
  "scripts",
  "dethi",
  "n5",
  "master-data.json",
);
const masterData = JSON.parse(await readFile(filePath, "utf8"));
let updated = 0;

for (const test of masterData.tests) {
  for (const questions of Object.values(test.sections)) {
    for (const question of questions) {
      const highlightText = highlights[question.id];
      if (!highlightText) continue;
      if (!question.prompt.includes(highlightText)) {
        throw new Error(
          `${question.id}: prompt does not contain highlight "${highlightText}".`,
        );
      }
      question.highlightText = highlightText;
      updated += 1;
    }
  }
}

await writeFile(filePath, `${JSON.stringify(masterData, null, 2)}\n`, "utf8");
console.log(`Added highlightText to ${updated} N5 questions.`);
