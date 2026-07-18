import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { roles } from "@/lib/auth/permissions";
import { AuthError, requirePermission } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";

const CreateUserSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  password: z.string().min(1),
  displayName: z.string().optional(),
  phone: z.string().optional(),
  gender: z.enum(["male", "female", "other", "unknown"]).default("unknown"),
  roles: z.array(z.enum(roles)).default(["user"]),
  status: z.enum(["active", "inactive", "banned", "pending_verify"]).default("active"),
  aiCredits: z.coerce.number().int().min(0).default(1),
  gachaTickets: z.coerce.number().int().min(0).default(0),
});

export async function GET(request: NextRequest) {
  try {
    await requirePermission("admin:user:read");
    await connectMongoDB();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    const role = searchParams.get("role");
    const status = searchParams.get("status");
    const gender = searchParams.get("gender");
    const page = Math.max(Number(searchParams.get("page") || 1), 1);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 10), 5), 50);

    const filter: Record<string, unknown> = {};

    if (q) {
      filter.$or = [
        { username: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { displayName: { $regex: q, $options: "i" } },
        { "profile.phone": { $regex: q, $options: "i" } },
      ];
    }

    if (role && role !== "all") {
      filter.roles = role;
    }

    if (status && status !== "all") {
      filter.status = status;
    }

    if (gender && gender !== "all") {
      filter["profile.gender"] = gender;
    }

    const [users, total] = await Promise.all([
      UserModel.find(filter)
        .select("-passwordHash -passwordReset")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      UserModel.countDocuments(filter),
    ]);

    return NextResponse.json({
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { message: error.message, code: error.code },
        { status: error.code === "UNAUTHORIZED" ? 401 : 403 },
      );
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Không thể tải danh sách người dùng." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requirePermission("admin:user:write");
    await connectMongoDB();

    const payload = CreateUserSchema.parse(await request.json());
    const username = payload.username.trim().toLowerCase();
    const email = payload.email.trim().toLowerCase();
    const existed = await UserModel.exists({ $or: [{ username }, { email }] });

    if (existed) {
      return NextResponse.json({ message: "Username hoặc email đã tồn tại." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(payload.password, 12);
    const user = await UserModel.create({
      username,
      email,
      passwordHash,
      displayName: payload.displayName || username,
      roles: payload.roles,
      status: payload.status,
      aiCredits: payload.aiCredits,
      pendingGachaTickets: payload.gachaTickets,
      profile: {
        gender: payload.gender,
        phone: payload.phone,
      },
    });
    await UserModel.collection.updateOne(
      { _id: user._id },
      {
        $set: {
          aiCredits: payload.aiCredits,
          pendingGachaTickets: payload.gachaTickets,
        },
      },
    );

    const safeUser = await UserModel.collection.findOne(
      { _id: user._id },
      { projection: { passwordHash: 0, passwordReset: 0 } },
    );

    return NextResponse.json({ data: safeUser }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { message: error.message, code: error.code },
        { status: error.code === "UNAUTHORIZED" ? 401 : 403 },
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Dữ liệu tạo người dùng không hợp lệ.", issues: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Không thể tạo người dùng." },
      { status: 500 },
    );
  }
}
