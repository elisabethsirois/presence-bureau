"use server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type ActionResult = {
  success?: boolean;
  error?: string;
};

export async function createTeamAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
    const name = formData.get("name")?.toString().trim();

    if (!name) {
      return { error: "Le nom de l'équipe ne peut pas être vide." };
    }

    const existing = await prisma.team.findUnique({
      where: { name },
    });

    if (existing) {
      return { error: "Une équipe avec ce nom existe déjà." };
    }

    await prisma.team.create({
      data: { name },
    });

    revalidatePath("/admin");
    revalidatePath("/register");
    return { success: true };
  } catch (e: any) {
    return { error: e.message || "Erreur lors de la création de l'équipe." };
  }
}

export async function deleteTeamAction(teamId: string): Promise<ActionResult> {
  try {
    await requireAdmin();

    // Les utilisateurs rattachés verront leur teamId passer à null (onDelete: SetNull)
    await prisma.team.delete({
      where: { id: teamId },
    });

    revalidatePath("/admin");
    revalidatePath("/");
    return { success: true };
  } catch (e: any) {
    return { error: e.message || "Erreur lors de la suppression de l'équipe." };
  }
}

export async function updateUserTeamAction(
  userId: string,
  teamId: string | null
): Promise<ActionResult> {
  try {
    await requireAdmin();

    await prisma.user.update({
      where: { id: userId },
      data: { teamId: teamId || null },
    });

    revalidatePath("/admin");
    revalidatePath("/");
    return { success: true };
  } catch (e: any) {
    return { error: e.message || "Erreur lors du changement d'équipe." };
  }
}

export async function updateUserRoleAction(
  userId: string,
  role: "USER" | "ADMIN"
): Promise<ActionResult> {
  try {
    const currentAdmin = await requireAdmin();

    // Empêcher un admin de s'auto-rétrograder pour ne pas bloquer l'accès
    if (currentAdmin.id === userId && role === "USER") {
      return { error: "Vous ne pouvez pas retirer vos propres droits d'administrateur." };
    }

    await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (e: any) {
    return { error: e.message || "Erreur lors de la modification du rôle." };
  }
}

export async function deleteUserAction(userId: string): Promise<ActionResult> {
  try {
    const currentAdmin = await requireAdmin();

    if (currentAdmin.id === userId) {
      return { error: "Vous ne pouvez pas supprimer votre propre compte administrateur." };
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    revalidatePath("/admin");
    revalidatePath("/");
    return { success: true };
  } catch (e: any) {
    return { error: e.message || "Erreur lors de la suppression de l'utilisateur." };
  }
}