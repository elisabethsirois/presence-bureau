"use server";

import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const CYCLE: Record<string, "NONE" | "OFFICE" | "REMOTE" | "ABSENT"> = {
  NONE: "OFFICE",
  OFFICE: "REMOTE",
  REMOTE: "ABSENT",
  ABSENT: "NONE",
};

export async function togglePresenceAction(date: string, period: "am" | "pm") {
  const session = await requireAuth();

  const existing = await prisma.presence.findUnique({
    where: {
      date_userId: {
        date,
        userId: session.id,
      },
    },
  });

  const currentAm = existing?.amStatus || "NONE";
  const currentPm = existing?.pmStatus || "NONE";

  const nextAm = period === "am" ? CYCLE[currentAm] : currentAm;
  const nextPm = period === "pm" ? CYCLE[currentPm] : currentPm;

  if (nextAm === "NONE" && nextPm === "NONE") {
    if (existing) {
      await prisma.presence.delete({
        where: { id: existing.id },
      });
    }
    revalidatePath("/");
    return { date, userId: session.id, amStatus: "NONE", pmStatus: "NONE" };
  }

  const updated = await prisma.presence.upsert({
    where: {
      date_userId: {
        date,
        userId: session.id,
      },
    },
    update: {
      amStatus: nextAm,
      pmStatus: nextPm,
    },
    create: {
      date,
      userId: session.id,
      amStatus: nextAm,
      pmStatus: nextPm,
    },
  });

  revalidatePath("/");
  return updated;
}

export async function getMonthPresencesAction(year: number, month: number, targetTeamId?: string) {
  const session = await requireAuth();
  const effectiveTeamId = targetTeamId && session.role === "ADMIN" ? targetTeamId : session.teamId;

  if (!effectiveTeamId) {
    return { teamMembers: [], presences: [] };
  }

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  // Calculer dernier jour du mois
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const teamMembers = await prisma.user.findMany({
    where: { teamId: effectiveTeamId },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { firstName: "asc" },
  });

  const presences = await prisma.presence.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
      user: {
        teamId: effectiveTeamId,
      },
    },
    select: {
      date: true,
      userId: true,
      amStatus: true,
      pmStatus: true,
    },
  });

  return { teamMembers, presences };
}