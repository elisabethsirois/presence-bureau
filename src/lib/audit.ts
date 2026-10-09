import { prisma } from "@/lib/db";

export type AuditAction =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "USER_REGISTERED"
  | "EMAIL_VERIFIED"
  | "INVITATION_CREATED"
  | "INVITATION_REVOKED"
  | "INVITATION_ACCEPTED"
  | "ROLE_UPDATED"
  | "TEAM_UPDATED"
  | "USER_DELETED"
  | "PASSWORD_RESET_REQUESTED"
  | "PASSWORD_RESET_COMPLETED";

export interface CreateAuditLogParams {
  action: AuditAction | string;
  actorId?: string | null;
  target?: string | null;
  details?: Record<string, unknown> | string | null;
  ipAddress?: string | null;
}

export async function createAuditLog({
  action,
  actorId,
  target,
  details,
  ipAddress,
}: CreateAuditLogParams): Promise<void> {
  try {
    const formattedDetails =
      typeof details === "object" && details !== null
        ? JSON.stringify(details)
        : details || null;

    await prisma.auditLog.create({
      data: {
        action,
        actorId: actorId || null,
        target: target || null,
        details: formattedDetails,
        ipAddress: ipAddress || null,
      },
    });
  } catch (err) {
    console.error("[AuditLog Error]", err);
  }
}
