import { NextResponse } from "next/server";
import { AuthError, requirePermission } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { DeckModel } from "@/models/Deck";
import { ReviewLogModel } from "@/models/ReviewLog";
import { UserModel } from "@/models/User";
import { UserVocabularyProgressModel } from "@/models/UserVocabularyProgress";
import { VocabularyModel } from "@/models/Vocabulary";
import { CourseLearnerModel } from "@/models/CourseLearner";

const seedVocabulary = [
  {
    term: "勉強",
    kana: "べんきょう",
    romaji: "benkyou",
    meaningVi: "học tập",
    partOfSpeech: "n / suru-v",
    level: "n5",
    examples: [{ ja: "毎日、日本語を勉強しています。", vi: "Mỗi ngày tôi đều học tiếng Nhật." }],
    distractors: ["nghỉ ngơi", "đọc sách", "làm việc"],
    source: "system",
    isPublished: true,
  },
  {
    term: "習慣",
    kana: "しゅうかん",
    romaji: "shuukan",
    meaningVi: "thói quen",
    partOfSpeech: "n",
    level: "n4",
    examples: [{ ja: "朝早く起きる習慣があります。", vi: "Tôi có thói quen dậy sớm." }],
    distractors: ["tuần lễ", "khoảnh khắc", "kế hoạch"],
    source: "system",
    isPublished: true,
  },
  {
    term: "忘れる",
    kana: "わすれる",
    romaji: "wasureru",
    meaningVi: "quên",
    partOfSpeech: "v",
    level: "n5",
    examples: [{ ja: "宿題を忘れないでください。", vi: "Đừng quên bài tập nhé." }],
    distractors: ["nhớ", "đợi", "mượn"],
    source: "system",
    isPublished: true,
  },
  {
    term: "目標",
    kana: "もくひょう",
    romaji: "mokuhyou",
    meaningVi: "mục tiêu",
    partOfSpeech: "n",
    level: "n4",
    examples: [{ ja: "今年の目標はN4に合格することです。", vi: "Mục tiêu năm nay là đỗ N4." }],
    distractors: ["kết quả", "bài kiểm tra", "cơ hội"],
    source: "system",
    isPublished: true,
  },
] as const;

export async function POST() {
  try {
    await requirePermission("admin:stats:read");

    const mongoose = await connectMongoDB();

    await Promise.all([
      UserModel.createCollection(),
      DeckModel.createCollection(),
      VocabularyModel.createCollection(),
      UserVocabularyProgressModel.createCollection(),
      ReviewLogModel.createCollection(),
      CourseLearnerModel.createCollection(),
    ]);

    await Promise.all([
      UserModel.syncIndexes(),
      DeckModel.syncIndexes(),
      VocabularyModel.syncIndexes(),
      UserVocabularyProgressModel.syncIndexes(),
      ReviewLogModel.syncIndexes(),
      CourseLearnerModel.syncIndexes(),
    ]);

    const deck = await DeckModel.findOneAndUpdate(
      { slug: "jlpt-n5-foundation" },
      {
        $setOnInsert: {
          title: "JLPT N5 Foundation",
          slug: "jlpt-n5-foundation",
          description: "Bộ từ vựng nền tảng cho người mới bắt đầu học tiếng Nhật.",
          level: "n5",
          visibility: "public",
          status: "published",
          tags: ["N5", "Kana", "Vocabulary"],
          stats: {
            vocabularyCount: seedVocabulary.length,
            learnerCount: 0,
            ratingAverage: 0,
            ratingCount: 0,
          },
        },
      },
      { new: true, upsert: true },
    );

    await VocabularyModel.bulkWrite(
      seedVocabulary.map((item) => ({
        updateOne: {
          filter: { deckId: deck._id, term: item.term },
          update: { $setOnInsert: { ...item, deckId: deck._id } },
          upsert: true,
        },
      })),
    );

    const collections = await mongoose.connection.db?.listCollections().toArray();

    return NextResponse.json({
      ok: true,
      database: mongoose.connection.name,
      collections: collections?.map((collection) => collection.name).sort() ?? [],
      seeded: {
        decks: 1,
        vocabulary: seedVocabulary.length,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { ok: false, message: error.message, code: error.code },
        { status: error.code === "UNAUTHORIZED" ? 401 : 403 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to initialize database.",
      },
      { status: 500 },
    );
  }
}
