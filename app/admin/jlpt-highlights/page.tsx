import { connectMongoDB } from "@/lib/mongodb";
import { JlptHighlightSuggestionModel } from "@/models/JlptHighlightSuggestion";
import { JlptTestModel } from "@/models/JlptTest";
import { JlptHighlightsClient } from "./JlptHighlightsClient";

export default async function JlptHighlightsPage() {
  await connectMongoDB();
  const [tests, suggestions] = await Promise.all([
    JlptTestModel.find().select({ level: 1, number: 1, sections: 1 }).sort({ level: -1, number: 1 }).lean(),
    JlptHighlightSuggestionModel.find().sort({ status: 1, createdAt: -1 }).limit(100).lean(),
  ]);
  const questions = tests.flatMap((test) => (["vocabularyKanji", "grammarReading"] as const).flatMap((section) =>
    (test.sections?.[section] ?? []).map((question: { id: string; prompt: string; highlightText?: string }) => ({ level: test.level, testNumber: test.number, section, questionId: question.id, prompt: question.prompt, highlightText: question.highlightText ?? "" })),
  ));
  return <JlptHighlightsClient questions={questions} suggestions={suggestions.map((item) => ({ id: String(item._id), level: item.level, testNumber: item.testNumber, questionId: item.questionId, prompt: item.prompt, currentHighlightText: item.currentHighlightText, suggestedHighlightText: item.suggestedHighlightText, note: item.note, username: item.username, status: item.status }))} />;
}
