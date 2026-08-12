import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { AuthError, requirePermission } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { DeckModel } from "@/models/Deck";
import { VocabularyModel } from "@/models/Vocabulary";
import { UserModel } from "@/models/User";

const CreatePersonalDeckSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  accessMode: z.enum(["public", "private", "password", "invite"]).default("public"),
  password: z.string().min(4).max(100).optional(),
  invitedEmails: z.array(z.string().trim().email()).max(50).default([]),
  level: z.enum(["n5", "n4", "n3", "n2", "n1", "other"]).default("other"),
  coinPrice: z.coerce.number().int().min(0).max(10_000_000).default(0),
}).superRefine((value, context) => {
  if (value.accessMode === "password" && !value.password) context.addIssue({ code: "custom", path: ["password"], message: "Hãy nhập mật khẩu cho bộ từ." });
  if (value.accessMode === "invite" && !value.invitedEmails.length) context.addIssue({ code: "custom", path: ["invitedEmails"], message: "Hãy nhập ít nhất một email." });
});

export async function GET(request: NextRequest) {
  try {
    const session = await requirePermission("flashcard:read");
    await connectMongoDB();
    await moveLegacyVocabularyIntoADeck(session.userId);
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope") || "mine";
    const requestedDeckId = searchParams.get("deckId") || "";
    const ownershipFilter = requestedDeckId
      ? { _id: requestedDeckId, $or: [{ ownerId: session.userId }, { allowedUserIds: session.userId }, { accessMode: "public", visibility: "public" }] }
      : scope === "community"
        ? { ownerId: { $ne: session.userId }, accessMode: "public", visibility: "public" }
        : session.roles.includes("admin") ? {} : { $or: [{ ownerId: session.userId }, { allowedUserIds: session.userId }] };
    const decks = await DeckModel.find({ ...ownershipFilter, sourceType: "user", tags: "personal" })
      .select("title slug description level coinPrice stats accessMode allowedUserIds ownerId visibility updatedAt").sort({ updatedAt: -1 }).lean();
    const invitedUserIds = [...new Set(decks.flatMap((deck) => (deck.allowedUserIds || []).map((id: unknown) => String(id))))];
    const invitedUsers = invitedUserIds.length ? await UserModel.find({ _id: { $in: invitedUserIds } }).select("email").lean() : [];
    const emailByUserId = new Map(invitedUsers.map((user) => [String(user._id), user.email]));
    return NextResponse.json({ data: decks.map((deck) => ({
      _id: String(deck._id), title: deck.title, slug: deck.slug, description: deck.description,
      vocabularyCount: deck.stats?.vocabularyCount || 0, accessMode: deck.accessMode || (deck.visibility === "public" ? "public" : "private"),
      invitedEmails: (deck.allowedUserIds || []).map((id: unknown) => emailByUserId.get(String(id))).filter(Boolean), updatedAt: deck.updatedAt,
      canEdit: session.roles.includes("admin") || String(deck.ownerId) === session.userId,
      canAdd: String(deck.ownerId) === session.userId,
      level: deck.level || "other", coinPrice: Number(deck.coinPrice) || 0,
    })) });
  } catch (error) {
    return handleError(error, "Không thể tải danh sách bộ từ.");
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission("flashcard:create");
    await connectMongoDB();
    const payload = CreatePersonalDeckSchema.parse(await request.json());
    const allowedUserIds = await resolveInvitedUsers(payload.accessMode, payload.invitedEmails);
    const accessPasswordHash = payload.accessMode === "password" ? await bcrypt.hash(payload.password!, 12) : undefined;
    const slug = await uniquePersonalSlug(payload.title, session.userId);
    const deck = await DeckModel.create({
      title: payload.title, slug, description: payload.description || "", level: payload.level === "other" ? "custom" : payload.level, coinPrice: payload.coinPrice,
      sourceType: "user", ownerId: session.userId, visibility: payload.accessMode === "public" ? "public" : "private", status: payload.accessMode === "public" ? "published" : "draft",
      accessMode: payload.accessMode, accessPasswordHash, allowedUserIds,
      tags: ["personal"], stats: { vocabularyCount: 0, learnerCount: 0 },
    });
    return NextResponse.json({ data: { _id: String(deck._id), title: deck.title, description: deck.description, level: payload.level, coinPrice: payload.coinPrice, vocabularyCount: 0, accessMode: payload.accessMode, invitedEmails: payload.invitedEmails } }, { status: 201 });
  } catch (error) {
    return handleError(error, "Không thể tạo bộ từ.");
  }
}

async function resolveInvitedUsers(accessMode: string, emails: string[]) {
  if (accessMode !== "invite") return [];
  const normalized = [...new Set(emails.map((email) => email.toLowerCase()))];
  const users = await UserModel.find({ email: { $in: normalized } }).select("_id email").lean();
  const found = new Set(users.map((user) => user.email));
  const missing = normalized.filter((email) => !found.has(email));
  if (missing.length) throw new Error(`Email chưa tồn tại trong hệ thống: ${missing.join(", ")}`);
  return users.map((user) => user._id);
}

async function moveLegacyVocabularyIntoADeck(userId: string) {
  const ownedDeckIds = await DeckModel.find({ ownerId: userId, sourceType: "user", tags: "personal" }).distinct("_id");
  const legacyFilter = { createdBy: new Types.ObjectId(userId), source: "user", ...(ownedDeckIds.length ? { deckId: { $nin: ownedDeckIds } } : {}) };
  const legacyCount = await VocabularyModel.countDocuments(legacyFilter);
  if (!legacyCount) return;
  const deck = await DeckModel.findOneAndUpdate(
    { slug: `personal-${userId}-legacy` },
    { $setOnInsert: { title: "Từ vựng cũ", description: "Các từ đã tạo trước khi có tính năng bộ từ.", level: "custom", sourceType: "user", ownerId: new Types.ObjectId(userId), visibility: "private", status: "draft", tags: ["personal"] }, $set: { "stats.learnerCount": 0 } },
    { new: true, upsert: true },
  );
  await VocabularyModel.updateMany(legacyFilter, { $set: { deckId: deck._id } });
  const vocabularyCount = await VocabularyModel.countDocuments({ deckId: deck._id, createdBy: userId });
  await DeckModel.updateOne({ _id: deck._id }, { $set: { "stats.vocabularyCount": vocabularyCount } });
}

async function uniquePersonalSlug(title: string, userId: string) {
  const base = title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "bo-tu";
  const prefix = `personal-${userId}-${base}`;
  let slug = prefix;
  let suffix = 2;
  while (await DeckModel.exists({ slug })) slug = `${prefix}-${suffix++}`;
  return slug;
}

function handleError(error: unknown, fallback: string) {
  if (error instanceof AuthError) return NextResponse.json({ message: error.message, code: error.code }, { status: error.code === "UNAUTHORIZED" ? 401 : 403 });
  if (error instanceof z.ZodError) return NextResponse.json({ message: "Dữ liệu bộ từ chưa hợp lệ.", issues: error.issues }, { status: 400 });
  return NextResponse.json({ message: error instanceof Error ? error.message : fallback }, { status: 500 });
}
