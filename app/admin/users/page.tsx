import { connectMongoDB } from "@/lib/mongodb";
import { UserModel } from "@/models/User";
import { AdminUsersClient } from "./AdminUsersClient";
import { requireAdminPage } from "@/lib/admin/page-auth";
import { ensureRbacSeeded } from "@/lib/auth/rbac";
import { RoleModel } from "@/models/Role";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const statuses = ["active", "inactive", "banned", "pending_verify"];
const genders = ["male", "female", "other", "unknown"];

export default async function AdminUsersPage({ searchParams }: Readonly<{ searchParams: SearchParams }>) {
  const session = await requireAdminPage("admin:user:read");
  const params = await searchParams;
  const page = clampNumber(firstParam(params.page), 1, 9999, 1);
  const limit = clampNumber(firstParam(params.limit), 10, 50, 10);
  const q = firstParam(params.q).trim();
  const role = firstParam(params.role);
  const status = firstParam(params.status);
  const gender = firstParam(params.gender);

  await connectMongoDB();
  await ensureRbacSeeded();
  const availableRoles = await RoleModel.find({ isActive: true }).select("name code").sort({ isSystem: -1, name: 1 }).lean();

  const filter: Record<string, unknown> = {};

  if (q) {
    const safeQuery = escapeRegex(q);
    filter.$or = [
      { username: { $regex: safeQuery, $options: "i" } },
      { email: { $regex: safeQuery, $options: "i" } },
      { displayName: { $regex: safeQuery, $options: "i" } },
      { "profile.phone": { $regex: safeQuery, $options: "i" } },
    ];
  }

  if (availableRoles.some((item) => item.code === role)) {
    filter.roles = role;
  }

  if (statuses.includes(status)) {
    filter.status = status;
  }

  if (genders.includes(gender)) {
    filter["profile.gender"] = gender;
  }

  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    UserModel.find(filter)
      .select("-passwordHash -passwordReset")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    UserModel.countDocuments(filter),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <AdminUsersClient
      meta={{ page: Math.min(page, totalPages), limit, total, totalPages }}
      roleOptions={availableRoles.map((item) => ({ label: item.name, value: item.code }))}
      capabilities={{ create: session.permissions.includes("admin:user:create"), update: session.permissions.includes("admin:user:update"), delete: session.permissions.includes("admin:user:delete") }}
      users={users.map((user) => ({
        _id: String(user._id),
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        roles: user.roles,
        status: user.status,
        aiCredits: typeof user.aiCredits === "number" ? user.aiCredits : 1,
        pendingGachaTickets: typeof user.pendingGachaTickets === "number" ? user.pendingGachaTickets : 0,
        profile: {
          gender: user.profile?.gender,
          phone: user.profile?.phone,
        },
        createdAt: user.createdAt ? user.createdAt.toISOString() : undefined,
      }))}
    />
  );
}

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return value || "";
}

function clampNumber(value: string, min: number, max: number, fallback: number) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.floor(numberValue)));
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
