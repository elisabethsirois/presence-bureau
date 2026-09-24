"use server";

import { prisma } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

export type AuthState = {
  error?: string;
  success?: boolean;
};

export async function loginAction(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    return { error: "Veuillez remplir tous les champs." };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { team: true },
  });

  if (!user) {
    return { error: "Identifiants invalides." };
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return { error: "Identifiants invalides." };
  }

  await createSession({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    teamId: user.teamId,
    teamName: user.team?.name,
  });

  redirect("/");
}

export async function registerAction(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const firstName = formData.get("firstName")?.toString().trim();
  const lastName = formData.get("lastName")?.toString().trim();
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const password = formData.get("password")?.toString();
  const teamId = formData.get("teamId")?.toString().trim() || null;

  if (!firstName || !lastName || !email || !password) {
    return { error: "Veuillez remplir tous les champs obligatoires." };
  }

  if (password.length < 6) {
    return { error: "Le mot de passe doit comporter au moins 6 caractères." };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return { error: "Cette adresse courriel est déjà utilisée." };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // Si c'est le tout premier utilisateur, on le promeut Admin
  const totalUsers = await prisma.user.count();
  const role = totalUsers === 0 ? "ADMIN" : "USER";

  const newUser = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      passwordHash,
      role,
      teamId: teamId || null,
    },
    include: { team: true },
  });

  await createSession({
    id: newUser.id,
    email: newUser.email,
    firstName: newUser.firstName,
    lastName: newUser.lastName,
    role: newUser.role,
    teamId: newUser.teamId,
    teamName: newUser.team?.name,
  });

  redirect("/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}