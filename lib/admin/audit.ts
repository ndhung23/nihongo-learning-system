import { AuditLogModel } from "@/models/AuditLog";

const blockedKeys = new Set(["password", "passwordHash", "accessPasswordHash", "token", "tokenHash", "secret"]);
function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([key]) => !blockedKeys.has(key)).map(([key, item]) => [key, sanitize(item)]));
}
export async function writeAudit(actorId: string, action: string, resource: string, resourceId: string, before?: unknown, after?: unknown) {
  await AuditLogModel.create({ actorId, action, resource, resourceId, before: sanitize(before), after: sanitize(after) });
}
