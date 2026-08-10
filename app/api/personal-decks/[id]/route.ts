import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { AuthError, requirePermission } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { DeckModel } from "@/models/Deck";
import { UserModel } from "@/models/User";
import { VocabularyModel } from "@/models/Vocabulary";

const UpdateSchema = z.object({
  title: z.string().trim().min(2).max(120), description: z.string().trim().max(500).default(""),
  accessMode: z.enum(["public", "private", "password", "invite"]),
  password: z.string().max(100).optional(), invitedEmails: z.array(z.string().trim().email()).max(50).default([]),
});

export async function PATCH(request: NextRequest, context: RouteContext<"/api/personal-decks/[id]">) {
  try {
    const session = await requirePermission("flashcard:update:own");
    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) return NextResponse.json({ message: "ID bộ từ không hợp lệ." }, { status: 400 });
    await connectMongoDB();
    const deck = await DeckModel.findOne({ _id: id, sourceType: "user", tags: "personal" }).select("+accessPasswordHash ownerId");
    if (!deck) return NextResponse.json({ message: "Không tìm thấy bộ từ." }, { status: 404 });
    if (String(deck.ownerId) !== session.userId && !session.roles.includes("admin")) return NextResponse.json({ message: "Bạn không có quyền sửa bộ từ này." }, { status: 403 });
    const payload = UpdateSchema.parse(await request.json());
    const normalized = [...new Set(payload.invitedEmails.map((email) => email.toLowerCase()))];
    const users = payload.accessMode === "invite" ? await UserModel.find({ email: { $in: normalized } }).select("_id email").lean() : [];
    const found = new Set(users.map((user) => user.email));
    const missing = normalized.filter((email) => !found.has(email));
    if (missing.length) return NextResponse.json({ message: `Email chưa tồn tại trong hệ thống: ${missing.join(", ")}` }, { status: 400 });
    if (payload.accessMode === "invite" && !users.length) return NextResponse.json({ message: "Hãy nhập ít nhất một email đã đăng ký." }, { status: 400 });
    if (payload.accessMode === "password" && !payload.password && !deck.accessPasswordHash) return NextResponse.json({ message: "Hãy nhập mật khẩu cho bộ từ." }, { status: 400 });
    deck.title = payload.title; deck.description = payload.description; deck.visibility = payload.accessMode === "public" ? "public" : "private";
    deck.accessMode = payload.accessMode; deck.allowedUserIds = users.map((user) => user._id);
    if (payload.accessMode === "password" && payload.password) deck.accessPasswordHash = await bcrypt.hash(payload.password, 12);
    if (payload.accessMode !== "password") deck.accessPasswordHash = undefined;
    await deck.save();
    return NextResponse.json({ data: { _id: id, title: deck.title, description: deck.description, accessMode: deck.accessMode, invitedEmails: normalized, vocabularyCount: deck.stats?.vocabularyCount || 0 } });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ message: error.message }, { status: error.code === "UNAUTHORIZED" ? 401 : 403 });
    if (error instanceof z.ZodError) return NextResponse.json({ message: error.issues[0]?.message || "Dữ liệu chưa hợp lệ." }, { status: 400 });
    return NextResponse.json({ message: error instanceof Error ? error.message : "Không thể cập nhật bộ từ." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext<"/api/personal-decks/[id]">) {
  try {
    const session = await requirePermission("flashcard:update:own");
    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) return NextResponse.json({ message: "ID bộ từ không hợp lệ." }, { status: 400 });
    await connectMongoDB();

    const deck = await DeckModel.findOne({ _id: id, sourceType: "user", tags: "personal" }).select("ownerId").lean();
    if (!deck) return NextResponse.json({ message: "Không tìm thấy bộ từ." }, { status: 404 });
    if (String(deck.ownerId) !== session.userId && !session.roles.includes("admin")) {
      return NextResponse.json({ message: "Bạn không có quyền xóa bộ từ này." }, { status: 403 });
    }

    await VocabularyModel.deleteMany({ deckId: deck._id });
    await DeckModel.deleteOne({ _id: deck._id });
    return NextResponse.json({ message: "Đã xóa bộ từ." });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ message: error.message }, { status: error.code === "UNAUTHORIZED" ? 401 : 403 });
    return NextResponse.json({ message: error instanceof Error ? error.message : "Không thể xóa bộ từ." }, { status: 500 });
  }
}
