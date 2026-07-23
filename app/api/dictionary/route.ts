import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { VocabularyModel } from "@/models/Vocabulary";
import { consumeRateLimit, requestIdentity } from "@/lib/rateLimit";

type JishoItem = {
  is_common?: boolean;
  jlpt?: string[];
  japanese?: Array<{ word?: string; reading?: string }>;
  senses?: Array<{ english_definitions?: string[]; parts_of_speech?: string[] }>;
};

function sourceLinks(query: string) {
  const q = encodeURIComponent(query);
  return [
    { name: "Jisho", url: `https://jisho.org/search/${q}` },
    { name: "Weblio", url: `https://www.weblio.jp/content/${q}` },
    { name: "goo辞書", url: `https://dictionary.goo.ne.jp/srch/all/${q}/m0u/` },
    { name: "Kotobank", url: `https://kotobank.jp/word/${q}` },
    { name: "Takoboto", url: `https://takoboto.jp/?q=${q}` },
    { name: "Mazii", url: `https://mazii.net/vi-VN/search/word/javi/${q}` },
    { name: "JPDB", url: `https://jpdb.io/search?q=${q}` },
    { name: "Forvo", url: `https://forvo.com/search/${q}/ja/` },
  ];
}

async function translateToVietnamese(text: string) {
  const apiKey = process.env.GOOGLE_CLOUD_TRANSLATION_API_KEY;
  if (!apiKey || !text) return "";

  const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: text, source: "ja", target: "vi", format: "text" }),
    signal: AbortSignal.timeout(7000),
  });
  if (!response.ok) return "";
  const payload = (await response.json()) as { data?: { translations?: Array<{ translatedText?: string }> } };
  return payload.data?.translations?.[0]?.translatedText || "";
}

export async function GET(request: NextRequest) {
  const rate = consumeRateLimit(`dictionary:${requestIdentity(request)}`, 60, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { message: "Bạn tra từ quá nhanh. Vui lòng thử lại sau ít phút." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
    );
  }

  const query = (request.nextUrl.searchParams.get("q") || "").trim().slice(0, 100);
  if (!query) return NextResponse.json({ message: "Vui lòng nhập từ cần tra." }, { status: 400 });

  const links = sourceLinks(query);
  const googleTranslateUrl = `https://translate.google.com/?sl=ja&tl=vi&text=${encodeURIComponent(query)}&op=translate`;

  try {
    await connectMongoDB();
    const local = await VocabularyModel.find({
      $or: [{ term: query }, { kana: query }, { romaji: query.toLowerCase() }, { meaningVi: query }],
    })
      .select("_id deckId term kana romaji meaningVi partOfSpeech level lesson examples synonyms antonyms audioUrl")
      .limit(6)
      .lean();

    let jisho: JishoItem[] = [];
    try {
      const response = await fetch(`https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(query)}`, {
        headers: { Accept: "application/json", "User-Agent": "NihongoLearningSystem/1.0" },
        next: { revalidate: 86400 },
        signal: AbortSignal.timeout(7000),
      });
      if (response.ok) {
        const payload = (await response.json()) as { data?: JishoItem[] };
        jisho = (payload.data || []).slice(0, 5);
      }
    } catch {
      // Local results and source links remain usable if Jisho is unavailable.
    }

    const firstJisho = jisho[0];
    const fallbackVi = local.length === 0
      ? await translateToVietnamese(firstJisho?.japanese?.[0]?.word || query)
      : "";
    const entries = local.length
      ? local.map((item) => ({
          id: String(item._id),
          deckId: item.deckId ? String(item.deckId) : undefined,
          term: item.term,
          reading: item.kana || "",
          romaji: item.romaji || "",
          meaningVi: item.meaningVi,
          partOfSpeech: item.partOfSpeech || "",
          jlpt: item.level && item.level !== "custom" ? item.level.toUpperCase() : "",
          lesson: item.lesson,
          examples: item.examples || [],
          synonyms: item.synonyms || [],
          antonyms: item.antonyms || [],
          audioUrl: item.audioUrl || "",
          source: "Nihongo Learning System",
        }))
      : jisho.map((item, index) => {
          const japanese = item.japanese?.[0] || {};
          const senses = item.senses || [];
          return {
            term: japanese.word || japanese.reading || query,
            reading: japanese.reading || "",
            romaji: "",
            meaningVi: index === 0 ? fallbackVi : "",
            meaningsEn: senses.flatMap((sense) => sense.english_definitions || []).slice(0, 8),
            partOfSpeech: senses.flatMap((sense) => sense.parts_of_speech || []).slice(0, 4).join(", "),
            jlpt: (item.jlpt || []).map((level) => level.replace("jlpt-", "").toUpperCase()).join(", "),
            examples: [],
            synonyms: [],
            antonyms: [],
            isCommon: Boolean(item.is_common),
            source: "Jisho",
          };
        });

    return NextResponse.json({
      query,
      entries,
      links,
      googleTranslateUrl,
      googleConfigured: Boolean(process.env.GOOGLE_CLOUD_TRANSLATION_API_KEY),
    }, { headers: { "Cache-Control": "private, max-age=300" } });
  } catch (error) {
    return NextResponse.json({
      query,
      entries: [],
      links,
      googleTranslateUrl,
      googleConfigured: Boolean(process.env.GOOGLE_CLOUD_TRANSLATION_API_KEY),
      message: error instanceof Error ? error.message : "Không thể tra từ lúc này.",
    });
  }
}
