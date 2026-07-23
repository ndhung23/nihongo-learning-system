import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectMongoDB } from "@/lib/mongodb";
import { VocabularyModel } from "@/models/Vocabulary";
import { consumeRateLimit, requestIdentity } from "@/lib/rateLimit";
import { DictionaryEntryModel } from "@/models/DictionaryEntry";
import { AuthError, requireAuth } from "@/lib/auth/session";

type JishoItem = {
  is_common?: boolean;
  jlpt?: string[];
  japanese?: Array<{ word?: string; reading?: string }>;
  senses?: Array<{ english_definitions?: string[]; parts_of_speech?: string[] }>;
};

type JotobaWord = {
  reading?: { kana?: string; kanji?: string };
  common?: boolean;
  senses?: Array<{
    glosses?: string[];
    language?: string;
    pos?: Array<Record<string, string>>;
    antonym?: string;
    xref?: string;
  }>;
  audio?: string;
};

type JotobaResult = {
  words: JotobaWord[];
  sentences: Array<{ content?: string; translation?: string; eng?: string }>;
};

type SavedCommunityMeaning = {
  _id: unknown;
  meaningVi: string;
  username?: string;
  isVisible: boolean;
};

const CommunityMeaningSchema = z.object({
  term: z.string().trim().min(1).max(100),
  reading: z.string().trim().max(100).optional().default(""),
  meaningVi: z.string().trim().min(2).max(300),
});

function sourceLinks(query: string) {
  const q = encodeURIComponent(query);
  return [
    { name: "Jisho", url: `https://jisho.org/search/${q}` },
    { name: "Jotoba", url: `https://jotoba.de/search/0/${q}` },
    { name: "Weblio", url: `https://www.weblio.jp/content/${q}` },
    { name: "goo辞書", url: `https://dictionary.goo.ne.jp/srch/all/${q}/m0u/` },
    { name: "Kotobank", url: `https://kotobank.jp/word/${q}` },
    { name: "Takoboto", url: `https://takoboto.jp/?q=${q}` },
    { name: "Mazii", url: `https://mazii.net/vi-VN/search/word/javi/${q}` },
    { name: "JPDB", url: `https://jpdb.io/search?q=${q}` },
    { name: "Forvo", url: `https://forvo.com/search/${q}/ja/` },
  ];
}

async function fetchJotoba(query: string): Promise<JotobaResult> {
  const requestBody = JSON.stringify({ query, language: "English", no_english: false });
  try {
    const [wordsResponse, sentencesResponse] = await Promise.all([
      fetch("https://jotoba.de/api/search/words", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: requestBody,
        signal: AbortSignal.timeout(7000),
      }),
      fetch("https://jotoba.de/api/search/sentences", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: requestBody,
        signal: AbortSignal.timeout(7000),
      }),
    ]);
    const wordsPayload = wordsResponse.ok
      ? await wordsResponse.json() as { words?: JotobaWord[] }
      : {};
    const sentencesPayload = sentencesResponse.ok
      ? await sentencesResponse.json() as { sentences?: JotobaResult["sentences"] }
      : {};
    return {
      words: (wordsPayload.words || []).slice(0, 5),
      sentences: (sentencesPayload.sentences || []).slice(0, 3),
    };
  } catch {
    return { words: [], sentences: [] };
  }
}

async function buildJotobaExamples(sentences: JotobaResult["sentences"]) {
  return Promise.all(sentences.map(async (sentence) => {
    const english = sentence.translation || sentence.eng || "";
    const googleVi = english ? await translateToVietnamese(english, "en") : "";
    const vi = googleVi || (english ? await translateWithMyMemory(english, "en") : "");
    return { ja: sentence.content || "", vi, en: english };
  })).then((examples) => examples.filter((example) => example.ja));
}

const translationCache = new Map<string, string>();

function deduplicateMeanings(value: string) {
  const seen = new Set<string>();
  return value
    .split(";")
    .map((meaning) => meaning.trim())
    .filter((meaning) => {
      const key = meaning.toLocaleLowerCase("vi");
      if (!meaning || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join("; ");
}

async function translateToVietnamese(text: string, source: "en" | "ja") {
  const cacheKey = `${source}:${text.toLowerCase()}`;
  const cached = translationCache.get(cacheKey);
  if (cached) return cached;

  const apiKey = process.env.GOOGLE_CLOUD_TRANSLATION_API_KEY;
  if (!apiKey || !text) return "";

  const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: text, source, target: "vi", format: "text" }),
    signal: AbortSignal.timeout(7000),
  });
  if (!response.ok) return "";
  const payload = (await response.json()) as { data?: { translations?: Array<{ translatedText?: string }> } };
  const translated = deduplicateMeanings(payload.data?.translations?.[0]?.translatedText || "");
  if (translated) {
    if (translationCache.size >= 1000) {
      const oldestKey = translationCache.keys().next().value;
      if (oldestKey) translationCache.delete(oldestKey);
    }
    translationCache.set(cacheKey, translated);
  }
  return translated;
}

async function translateWithMyMemory(text: string, source: "en" | "ja") {
  try {
    const params = new URLSearchParams({
      q: text.slice(0, 450),
      langpair: `${source}|vi`,
      mt: "1",
    });
    if (process.env.MYMEMORY_CONTACT_EMAIL) {
      params.set("de", process.env.MYMEMORY_CONTACT_EMAIL);
    }
    const response = await fetch(`https://api.mymemory.translated.net/get?${params.toString()}`, {
      headers: { Accept: "application/json", "User-Agent": "NihongoLearningSystem/1.0" },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) return "";

    const payload = (await response.json()) as {
      responseStatus?: number;
      responseData?: { translatedText?: string };
    };
    const translated = deduplicateMeanings(payload.responseData?.translatedText?.trim() || "");
    return payload.responseStatus === 200 &&
      translated &&
      translated.toLocaleLowerCase("vi") !== text.toLocaleLowerCase(source)
      ? translated
      : "";
  } catch {
    return "";
  }
}

async function translateEnglishWithAi(text: string) {
  const googleTranslation = await translateToVietnamese(text, "en");
  if (googleTranslation) return { text: googleTranslation, provider: "google" as const };

  const myMemoryTranslation = await translateWithMyMemory(text, "en");
  if (myMemoryTranslation) return { text: myMemoryTranslation, provider: "mymemory" as const };

  const apiKeys = Array.from(new Set(
    Object.entries(process.env)
      .filter(([name, value]) =>
        Boolean(value) &&
        (name === "GEMINI_API_KEY" ||
          name === "APIKEYGEMINI" ||
          /^GEMINI_API_KEY_\d+$/.test(name)),
      )
      .sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }))
      .map(([, value]) => value as string),
  ));
  const models = Array.from(new Set([
    process.env.GEMINI_MODEL,
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash-lite",
  ].filter((value): value is string => Boolean(value))));

  for (const model of models) {
    for (const apiKey of apiKeys) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                role: "user",
                parts: [{
                  text: `Dịch các nghĩa từ điển tiếng Anh sau sang tiếng Việt ngắn gọn và tự nhiên. Gộp các nghĩa trùng, phân cách bằng dấu chấm phẩy. Chỉ trả về bản dịch:\n${text}`,
                }],
              }],
              generationConfig: { temperature: 0.1, maxOutputTokens: 120 },
            }),
            signal: AbortSignal.timeout(12_000),
          },
        );
        if (!response.ok) continue;
        const payload = (await response.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const translated = deduplicateMeanings(payload.candidates?.[0]?.content?.parts
          ?.map((part) => part.text || "")
          .join("")
          .trim()
          .replace(/^["']|["']$/g, "") || "");
        if (translated) return { text: translated, provider: "gemini" as const };
      } catch {
        // Try the next configured key or model.
      }
    }
  }

  return { text: "", provider: "none" as const };
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
    const savedDictionaryEntry = local.length
      ? null
      : await DictionaryEntryModel.findOne({
          $or: [{ term: query }, { reading: query }, { lookupKey: query.toLowerCase() }],
        }).lean();

    if (savedDictionaryEntry) {
      if (!savedDictionaryEntry.meaningViAi && savedDictionaryEntry.meaningsEn?.length) {
        const retryTranslation = await translateEnglishWithAi(savedDictionaryEntry.meaningsEn.join("; "));
        if (retryTranslation.text) {
          savedDictionaryEntry.meaningViAi = retryTranslation.text;
          savedDictionaryEntry.translationProvider = retryTranslation.provider;
          await DictionaryEntryModel.updateOne(
            { _id: savedDictionaryEntry._id },
            {
              $set: {
                meaningViAi: retryTranslation.text,
                translationProvider: retryTranslation.provider,
                lastLookedUpAt: new Date(),
              },
            },
          );
        }
      }
      void DictionaryEntryModel.updateOne(
        { _id: savedDictionaryEntry._id },
        { $set: { lastLookedUpAt: new Date() } },
      );
      if (!savedDictionaryEntry.jotobaEnrichedAt) {
        const jotoba = await fetchJotoba(query);
        const jotobaExamples = await buildJotobaExamples(jotoba.sentences);
        const jotobaWord = jotoba.words[0];
        savedDictionaryEntry.examples = jotobaExamples;
        savedDictionaryEntry.antonyms = Array.from(new Set(
          jotobaWord?.senses?.map((sense) => sense.antonym).filter(Boolean) || [],
        ));
        savedDictionaryEntry.relatedWords = Array.from(new Set(
          jotobaWord?.senses?.map((sense) => sense.xref).filter(Boolean) || [],
        ));
        savedDictionaryEntry.audioUrl = jotobaWord?.audio
          ? `https://jotoba.de${jotobaWord.audio}`
          : "";
        savedDictionaryEntry.jotobaEnrichedAt = new Date();
        await DictionaryEntryModel.updateOne(
          { _id: savedDictionaryEntry._id },
          { $set: {
            examples: savedDictionaryEntry.examples,
            antonyms: savedDictionaryEntry.antonyms,
            relatedWords: savedDictionaryEntry.relatedWords,
            audioUrl: savedDictionaryEntry.audioUrl,
            jotobaEnrichedAt: savedDictionaryEntry.jotobaEnrichedAt,
          } },
        );
      }
      return NextResponse.json({
        query,
        entries: [{
          id: String(savedDictionaryEntry._id),
          term: savedDictionaryEntry.term,
          reading: savedDictionaryEntry.reading || "",
          romaji: "",
          meaningVi: savedDictionaryEntry.meaningViAi || "",
          meaningSource: savedDictionaryEntry.meaningViAi ? "ai" : "none",
          translationProvider: savedDictionaryEntry.translationProvider || "none",
          meaningsEn: savedDictionaryEntry.meaningsEn || [],
          partOfSpeech: savedDictionaryEntry.partOfSpeech || "",
          jlpt: savedDictionaryEntry.jlpt || "",
          examples: savedDictionaryEntry.examples || [],
          synonyms: [],
          antonyms: savedDictionaryEntry.antonyms || [],
          relatedWords: savedDictionaryEntry.relatedWords || [],
          audioUrl: savedDictionaryEntry.audioUrl || "",
          communityMeanings: (savedDictionaryEntry.communityMeanings || [])
            .filter((item: SavedCommunityMeaning) => item.isVisible)
            .slice(-10)
            .reverse()
            .map((item: SavedCommunityMeaning) => ({
              id: String(item._id),
              meaningVi: item.meaningVi,
              contributor: item.username || "Thành viên cộng đồng",
            })),
          source: "Từ điển đã lưu",
        }],
        links,
        googleTranslateUrl,
        googleConfigured: Boolean(process.env.GOOGLE_CLOUD_TRANSLATION_API_KEY),
      }, { headers: { "Cache-Control": "private, max-age=60" } });
    }

    const jotobaPromise = fetchJotoba(query);
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
    const jotoba = await jotobaPromise;
    const jotobaWord = jotoba.words[0];
    const jotobaExamples = await buildJotobaExamples(jotoba.sentences);

    const firstJisho = jisho[0];
    const jishoEnglishMeanings =
      firstJisho?.senses?.flatMap((sense) => sense.english_definitions || []).slice(0, 8) || [];
    const firstEnglishMeanings = jishoEnglishMeanings.length
      ? jishoEnglishMeanings
      : jotobaWord?.senses
          ?.filter((sense) => sense.language === "English")
          .flatMap((sense) => sense.glosses || [])
          .slice(0, 8) || [];
    const aiTranslation = local.length === 0 && firstEnglishMeanings.length
      ? await translateEnglishWithAi(firstEnglishMeanings.join("; "))
      : { text: "", provider: "none" as const };
    let japaneseTranslation: { text: string; provider: "google" | "mymemory" | "none" } = {
      text: "",
      provider: "none",
    };
    if (local.length === 0 && !aiTranslation.text) {
      const japaneseText = firstJisho?.japanese?.[0]?.word || query;
      const googleJapanese = await translateToVietnamese(japaneseText, "ja");
      if (googleJapanese) {
        japaneseTranslation = { text: googleJapanese, provider: "google" };
      } else {
        const myMemoryJapanese = await translateWithMyMemory(japaneseText, "ja");
        if (myMemoryJapanese) {
          japaneseTranslation = { text: myMemoryJapanese, provider: "mymemory" };
        }
      }
    }
    const fallbackVi = aiTranslation.text || japaneseTranslation.text;

    if (local.length === 0 && (firstJisho || jotobaWord)) {
      const japanese = firstJisho?.japanese?.[0] || {
        word: jotobaWord?.reading?.kanji,
        reading: jotobaWord?.reading?.kana,
      };
      const term = japanese.word || japanese.reading || query;
      const reading = japanese.reading || "";
      await DictionaryEntryModel.findOneAndUpdate(
        { lookupKey: `${term}:${reading}`.toLowerCase() },
        {
          $set: {
            term,
            reading,
            meaningsEn: firstEnglishMeanings,
            meaningViAi: fallbackVi,
            translationProvider: aiTranslation.text ? aiTranslation.provider : japaneseTranslation.provider,
            partOfSpeech: firstJisho?.senses?.flatMap((sense) => sense.parts_of_speech || []).slice(0, 4).join(", ") ||
              jotobaWord?.senses?.flatMap((sense) => sense.pos || []).flatMap((part) => Object.keys(part)).slice(0, 4).join(", ") || "",
            jlpt: (firstJisho?.jlpt || []).map((level) => level.replace("jlpt-", "").toUpperCase()).join(", "),
            sourceUrl: links[0].url,
            examples: jotobaExamples,
            antonyms: Array.from(new Set(jotobaWord?.senses?.map((sense) => sense.antonym).filter(Boolean) || [])),
            relatedWords: Array.from(new Set(jotobaWord?.senses?.map((sense) => sense.xref).filter(Boolean) || [])),
            audioUrl: jotobaWord?.audio ? `https://jotoba.de${jotobaWord.audio}` : "",
            jotobaEnrichedAt: new Date(),
            lastLookedUpAt: new Date(),
          },
          $setOnInsert: { communityMeanings: [] },
        },
        { upsert: true, new: true },
      );
    }
    const combinedDictionaryItems: JishoItem[] = jisho.length
      ? jisho
      : jotoba.words.map((word) => ({
          japanese: [{ word: word.reading?.kanji, reading: word.reading?.kana }],
          is_common: word.common,
          senses: word.senses?.filter((sense) => sense.language === "English").map((sense) => ({
            english_definitions: sense.glosses,
            parts_of_speech: sense.pos?.flatMap((part) => Object.keys(part)),
          })),
        }));
    const entries = local.length
      ? local.map((item, index) => ({
          id: String(item._id),
          deckId: item.deckId ? String(item.deckId) : undefined,
          term: item.term,
          reading: item.kana || "",
          romaji: item.romaji || "",
          meaningVi: item.meaningVi,
          meaningSource: "course",
          translationProvider: "none",
          partOfSpeech: item.partOfSpeech || "",
          jlpt: item.level && item.level !== "custom" ? item.level.toUpperCase() : "",
          lesson: item.lesson,
          examples: item.examples || [],
          synonyms: item.synonyms || [],
          antonyms: index === 0
            ? Array.from(new Set([
                ...(item.antonyms || []),
                ...(jotobaWord?.senses?.map((sense) => sense.antonym).filter(Boolean) || []),
              ]))
            : item.antonyms || [],
          relatedWords: index === 0
            ? Array.from(new Set(jotobaWord?.senses?.map((sense) => sense.xref).filter(Boolean) || []))
            : [],
          audioUrl: item.audioUrl || "",
          source: "Nihongo Learning System",
        }))
      : combinedDictionaryItems.map((item, index) => {
          const japanese = item.japanese?.[0] || {};
          const senses = item.senses || [];
          return {
            term: japanese.word || japanese.reading || query,
            reading: japanese.reading || "",
            romaji: "",
            meaningVi: index === 0 ? fallbackVi : "",
            meaningSource: index === 0 && fallbackVi ? "ai" : "none",
            translationProvider: index === 0
              ? (aiTranslation.text ? aiTranslation.provider : japaneseTranslation.provider)
              : "none",
            meaningsEn: senses.flatMap((sense) => sense.english_definitions || []).slice(0, 8),
            partOfSpeech: senses.flatMap((sense) => sense.parts_of_speech || []).slice(0, 4).join(", "),
            jlpt: (item.jlpt || []).map((level) => level.replace("jlpt-", "").toUpperCase()).join(", "),
            examples: index === 0 ? jotobaExamples : [],
            synonyms: [],
            antonyms: index === 0
              ? Array.from(new Set(jotobaWord?.senses?.map((sense) => sense.antonym).filter(Boolean) || []))
              : [],
            relatedWords: index === 0
              ? Array.from(new Set(jotobaWord?.senses?.map((sense) => sense.xref).filter(Boolean) || []))
              : [],
            audioUrl: index === 0 && jotobaWord?.audio ? `https://jotoba.de${jotobaWord.audio}` : "",
            communityMeanings: [],
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

export async function POST(request: NextRequest) {
  const rate = consumeRateLimit(`dictionary-suggestion:${requestIdentity(request)}`, 5, 10 * 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { message: "Bạn gửi nghĩa quá nhanh. Vui lòng thử lại sau." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
    );
  }

  try {
    const session = await requireAuth();
    const payload = CommunityMeaningSchema.parse(await request.json());
    await connectMongoDB();

    const entry = await DictionaryEntryModel.findOne({
      $or: [{ term: payload.term }, { reading: payload.reading }],
    });
    if (!entry) {
      return NextResponse.json({ message: "Hãy tra từ này trước khi gửi nghĩa." }, { status: 404 });
    }

    const duplicate = entry.communityMeanings.some(
      (item: { meaningVi: string; userId: { toString(): string } }) =>
        item.userId.toString() === session.userId &&
        item.meaningVi.toLocaleLowerCase("vi") === payload.meaningVi.toLocaleLowerCase("vi"),
    );
    if (!duplicate) {
      entry.communityMeanings.push({
        userId: session.userId,
        username: session.username,
        meaningVi: payload.meaningVi,
        createdAt: new Date(),
        isVisible: true,
      });
      if (entry.communityMeanings.length > 50) {
        entry.communityMeanings = entry.communityMeanings.slice(-50);
      }
      await entry.save();
    }

    return NextResponse.json({
      data: {
        meaningVi: payload.meaningVi,
        contributor: session.username || "Thành viên cộng đồng",
      },
    }, { status: duplicate ? 200 : 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: "Bạn cần đăng nhập để góp ý nghĩa." }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Nghĩa góp ý cần từ 2 đến 300 ký tự." }, { status: 400 });
    }
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Không thể lưu nghĩa góp ý." },
      { status: 500 },
    );
  }
}
