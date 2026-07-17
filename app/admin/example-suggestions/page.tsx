import { connectMongoDB } from "@/lib/mongodb";
import { ExampleSuggestionModel } from "@/models/ExampleSuggestion";
import { ExampleSuggestionsClient } from "./ExampleSuggestionsClient";

export default async function AdminExampleSuggestionsPage() {
  await connectMongoDB();

  const suggestions = await ExampleSuggestionModel.find()
    .sort({ status: 1, createdAt: -1 })
    .limit(100)
    .lean();

  return (
    <ExampleSuggestionsClient
      suggestions={suggestions.map((suggestion) => ({
        _id: String(suggestion._id),
        term: suggestion.term,
        meaningVi: suggestion.meaningVi,
        suggestedJa: suggestion.suggestedJa,
        suggestedVi: suggestion.suggestedVi,
        note: suggestion.note,
        username: suggestion.username,
        status: suggestion.status,
        createdAt: suggestion.createdAt ? suggestion.createdAt.toISOString() : undefined,
      }))}
    />
  );
}
