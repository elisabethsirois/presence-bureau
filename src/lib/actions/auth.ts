"use server";

import crypto from "crypto";
import { prisma } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { validatePassword } from "@/lib/password-policy";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { createAuditLog } from "@/lib/audit";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  getLatestSimulatedEmail,
} from "@/lib/email";

export type AuthState = {
  error?: string;
  success?: boolean;
  message?: string;
  unverifiedEmail?: string;
};

export async function getLatestSimulatedCodeAction(email: string) {
  if (process.env.NODE_ENV === "production") return null;
  return getLatestSimulatedEmail(email) || null;
}

export async function loginAction(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    return { error: "Veuillez remplir tous les champs." };
  }

  // 1. Protection anti-bruteforce (limite de tentatives)
  const rateCheck = checkRateLimit(`login:${email}`, 5, 15 * 60 * 1000);
  if (!rateCheck.allowed) {
    await createAuditLog({
      action: "LOGIN_FAILED",
      target: email,
      details: "Blocage temporaire par limite de tentatives (Rate Limit)",
    });
    return {
      error: `Trop de tentatives de connexion échouées. Compte temporairement verrouillé. Veuillez réessayer dans ${Math.ceil(
        rateCheck.retryAfterSeconds / 60
      )} minute(s).`,
    };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { team: true },
  });

  if (!user) {
    await createAuditLog({
      action: "LOGIN_FAILED",
      target: email,
      details: "Utilisateur inexistant",
    });
    return { error: "Identifiants invalides." };
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    await createAuditLog({
      action: "LOGIN_FAILED",
      actorId: user.id,
      target: email,
      details: "Mot de passe erroné",
    });
    return { error: "Identifiants invalides." };
  }

  // 2. Vérification de l'adresse courriel
  if (!user.emailVerified) {
    // Génération et envoi d'un nouveau code OTP
    const token = crypto.randomBytes(32).toString("hex");
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await prisma.emailVerificationToken.deleteMany({ where: { email } });
    await prisma.emailVerificationToken.create({
      data: {
        email,
        token,
        code,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await sendVerificationEmail({
      to: user.email,
      code,
      token,
      firstName: user.firstName,
    });

    await createAuditLog({
      action: "LOGIN_FAILED",
      actorId: user.id,
      target: email,
      details: "Courriel non vérifié - Renvoi automatique d'un code OTP",
    });

    return {
      error: "Votre adresse courriel n'est pas encore vérifiée. Un code de vérification vient de vous être envoyé.",
      unverifiedEmail: user.email,
    };
  }

  // Succès de connexion
  resetRateLimit(`login:${email}`);

  await createAuditLog({
    action: "LOGIN_SUCCESS",
    actorId: user.id,
    target: email,
  });

  await createSession({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    teamId: user.teamId,
    teamName: user.team?.name,
    emailVerified: user.emailVerified,
  });

  redirect("/");
}

export async function registerAction(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const firstName = formData.get("firstName")?.toString().trim();
  const lastName = formData.get("lastName")?.toString().trim();
  const emailInput = formData.get("email")?.toString().trim().toLowerCase();
  const password = formData.get("password")?.toString();
  const teamIdInput = formData.get("teamId")?.toString().trim() || null;
  const inviteToken = formData.get("inviteToken")?.toString().trim() || null;

  if (!firstName || !lastName || !password) {
    return { error: "Veuillez remplir tous les champs obligatoires." };
  }

  // Limitation de débit sur les inscriptions
  const rateCheck = checkRateLimit("register:global", 20, 15 * 60 * 1000);
  if (!rateCheck.allowed) {
    return {
      error: "Trop de demandes d'inscription. Veuillez réessayer ultérieurement.",
    };
  }

  // Politique de mot de passe renforcée
  const passCheck = validatePassword(password);
  if (!passCheck.isValid) {
    return {
      error: `Mot de passe insuffisant : ${passCheck.errors.join(", ")}.`,
    };
  }

  const totalUsers = await prisma.user.count();
  const isFirstUser = totalUsers === 0;

  let finalEmail = emailInput || "";
  let finalTeamId = teamIdInput;
  let finalRole: "USER" | "ADMIN" = isFirstUser ? "ADMIN" : "USER";
  let isVerified = isFirstUser; // Le premier administrateur est automatiquement validé
  let invitationId: string | null = null;

  if (inviteToken) {
    // Inscription via invitation
    const invitation = await prisma.invitation.findUnique({
      where: { token: inviteToken },
      include: { team: true },
    });

    if (!invitation || invitation.expiresAt < new Date()) {
      return {
        error: "Cette invitation est invalide ou a expiré. Veuillez contacter un administrateur.",
      };
    }

    finalEmail = invitation.email.toLowerCase().trim();
    finalTeamId = invitation.teamId;
    finalRole = invitation.role;
    isVerified = true; // Vérification implicite via le courriel d'invitation sécurisé
    invitationId = invitation.id;
  } else if (!isFirstUser) {
    // Inscription sans invitation : vérification de la politique d'inscription
    const allowPublic = process.env.ALLOW_PUBLIC_REGISTRATION === "true";
    if (!allowPublic) {
      return {
        error:
          "L'inscription sur Présence Bureau est réservée aux personnes invitées par un administrateur. Veuillez utiliser votre lien d'invitation personnel.",
      };
    }

    if (!finalEmail) {
      return { error: "Veuillez renseigner votre adresse courriel." };
    }
  }

  if (!finalEmail) {
    return { error: "Adresse courriel manquante." };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: finalEmail },
  });

  if (existingUser) {
    return { error: "Cette adresse courriel est déjà utilisée." };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const newUser = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email: finalEmail,
      passwordHash,
      role: finalRole,
      teamId: finalTeamId,
      emailVerified: isVerified,
    },
    include: { team: true },
  });

  // Si l'utilisateur est passé par une invitation, supprimer l'invitation utilisée
  if (invitationId) {
    await prisma.invitation.delete({ where: { id: invitationId } }).catch(() => {});
    await createAuditLog({
      action: "INVITATION_ACCEPTED",
      actorId: newUser.id,
      target: finalEmail,
      details: { teamName: newUser.team?.name, role: finalRole },
    });
  }

  await createAuditLog({
    action: "USER_REGISTERED",
    actorId: newUser.id,
    target: finalEmail,
    details: {
      teamName: newUser.team?.name || "(Aucune)",
      role: finalRole,
      verifiedDirectly: isVerified,
    },
  });

  if (isVerified) {
    await createSession({
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      role: newUser.role,
      teamId: newUser.teamId,
      teamName: newUser.team?.name,
      emailVerified: true,
    });
    redirect("/");
  } else {
    // Génération du jeton et du code OTP de vérification
    const token = crypto.randomBytes(32).toString("hex");
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await prisma.emailVerificationToken.create({
      data: {
        email: newUser.email,
        token,
        code,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await sendVerificationEmail({
      to: newUser.email,
      code,
      token,
      firstName: newUser.firstName,
    });

    redirect(`/verify-email?email=${encodeURIComponent(newUser.email)}`);
  }
}

export async function verifyEmailAction(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const code = formData.get("code")?.toString().trim();
  const token = formData.get("token")?.toString().trim();

  if (!email || (!code && !token)) {
    return { error: "Veuillez renseigner votre courriel et le code de vérification." };
  }

  const rateCheck = checkRateLimit(`verify:${email}`, 5, 10 * 60 * 1000);
  if (!rateCheck.allowed) {
    return {
      error: `Trop de tentatives erronées. Réessayez dans ${Math.ceil(
        rateCheck.retryAfterSeconds / 60
      )} minute(s).`,
    };
  }

  const record = await prisma.emailVerificationToken.findFirst({
    where: {
      email,
      ...(token ? { token } : { code }),
      expiresAt: { gt: new Date() },
    },
  });

  if (!record) {
    return { error: "Code ou lien de vérification invalide ou expiré." };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { team: true },
  });

  if (!user) {
    return { error: "Compte utilisateur introuvable." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true },
  });

  await prisma.emailVerificationToken.deleteMany({
    where: { email },
  });

  resetRateLimit(`verify:${email}`);

  await createAuditLog({
    action: "EMAIL_VERIFIED",
    actorId: user.id,
    target: email,
  });

  // Connexion automatique après vérification réussie
  await createSession({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    teamId: user.teamId,
    teamName: user.team?.name,
    emailVerified: true,
  });

  redirect("/");
}

export async function resendVerificationAction(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email")?.toString().trim().toLowerCase();
  if (!email) {
    return { error: "Adresse courriel manquante." };
  }

  const rateCheck = checkRateLimit(`resend:${email}`, 2, 60 * 1000);
  if (!rateCheck.allowed) {
    return {
      error: `Veuillez patienter ${rateCheck.retryAfterSeconds} secondes avant de renvoyer un code.`,
    };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return {
      success: true,
      message: "Si un compte existe, un nouveau code a été expédié.",
    };
  }

  if (user.emailVerified) {
    return {
      success: true,
      message: "Votre adresse est déjà validée. Vous pouvez vous connecter.",
    };
  }

  await prisma.emailVerificationToken.deleteMany({ where: { email } });

  const token = crypto.randomBytes(32).toString("hex");
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  await prisma.emailVerificationToken.create({
    data: {
      email,
      token,
      code,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  await sendVerificationEmail({
    to: email,
    code,
    token,
    firstName: user.firstName,
  });

  return {
    success: true,
    message: "Un nouveau code de vérification vous a été envoyé.",
  };
}

export async function requestPasswordResetAction(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email")?.toString().trim().toLowerCase();
  if (!email) {
    return { error: "Veuillez indiquer votre adresse courriel." };
  }

  const rateCheck = checkRateLimit(`pwd_reset:${email}`, 3, 15 * 60 * 1000);
  if (!rateCheck.allowed) {
    return {
      error: `Trop de requêtes. Veuillez patienter ${Math.ceil(
        rateCheck.retryAfterSeconds / 60
      )} minute(s).`,
    };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    await prisma.passwordResetToken.deleteMany({ where: { email } });

    const token = crypto.randomBytes(32).toString("hex");
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await prisma.passwordResetToken.create({
      data: {
        email,
        token,
        code,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 heure
      },
    });

    await sendPasswordResetEmail({
      to: email,
      code,
      token,
      firstName: user.firstName,
    });

    await createAuditLog({
      action: "PASSWORD_RESET_REQUESTED",
      actorId: user.id,
      target: email,
    });
  }

  return {
    success: true,
    message:
      "Si un compte est associé à ce courriel, les instructions de réinitialisation vous ont été envoyées.",
  };
}

export async function resetPasswordAction(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const code = formData.get("code")?.toString().trim();
  const token = formData.get("token")?.toString().trim();
  const password = formData.get("password")?.toString();

  if (!email || (!code && !token) || !password) {
    return { error: "Veuillez remplir tous les champs obligatoires." };
  }

  const rateCheck = checkRateLimit(`pwd_confirm:${email}`, 5, 15 * 60 * 1000);
  if (!rateCheck.allowed) {
    return {
      error: `Trop de tentatives erronées. Réessayez dans ${Math.ceil(
        rateCheck.retryAfterSeconds / 60
      )} minute(s).`,
    };
  }

  const passCheck = validatePassword(password);
  if (!passCheck.isValid) {
    return {
      error: `Mot de passe trop faible : ${passCheck.errors.join(", ")}.`,
    };
  }

  const resetRecord = await prisma.passwordResetToken.findFirst({
    where: {
      email,
      ...(token ? { token } : { code }),
      expiresAt: { gt: new Date() },
    },
  });

  if (!resetRecord) {
    return { error: "Code ou lien de réinitialisation invalide ou expiré." };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.update({
    where: { id: resetRecord.userId },
    data: {
      passwordHash,
      emailVerified: true,
    },
  });

  await prisma.passwordResetToken.deleteMany({ where: { email } });
  resetRateLimit(`pwd_confirm:${email}`);

  await createAuditLog({
    action: "PASSWORD_RESET_COMPLETED",
    actorId: resetRecord.userId,
    target: email,
  });

  redirect("/login?reset=success");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}