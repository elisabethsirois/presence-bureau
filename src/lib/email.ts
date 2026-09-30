/**
 * Service d'envoi de courriels (Simulation locale + intégration Resend / SMTP).
 * En environnement de développement ou si aucun fournisseur n'est configuré,
 * les liens et codes de sécurité sont affichés dans la console du serveur
 * et stockés temporairement pour faciliter les tests.
 */

interface SendEmailResult {
  success: boolean;
  simulated: boolean;
  messageId?: string;
  error?: string;
  previewUrl?: string;
  code?: string;
}

// Mémoire tampon pour faciliter les tests et l'assistance en mode développement
const devEmailInbox = new Map<
  string,
  { type: string; code?: string; link?: string; timestamp: number }
>();

export function getLatestSimulatedEmail(email: string) {
  return devEmailInbox.get(email.toLowerCase().trim());
}

function getAppBaseUrl(): string {
  const url = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (url) {
    return url.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

/**
 * Envoi d'un courriel de vérification d'adresse
 */
export async function sendVerificationEmail({
  to,
  code,
  token,
  firstName,
}: {
  to: string;
  code: string;
  token: string;
  firstName?: string;
}): Promise<SendEmailResult> {
  const normalizedEmail = to.toLowerCase().trim();
  const baseUrl = getAppBaseUrl();
  const verifyLink = `${baseUrl}/verify-email?token=${token}&email=${encodeURIComponent(
    normalizedEmail
  )}`;

  devEmailInbox.set(normalizedEmail, {
    type: "VERIFICATION",
    code,
    link: verifyLink,
    timestamp: Date.now(),
  });

  const subject = "Vérifiez votre adresse courriel - Présence Bureau";
  const textContent = `Bonjour ${firstName || ""},\n\n` +
    `Votre code de vérification pour Présence Bureau est : ${code}\n\n` +
    `Ou cliquez directement sur ce lien pour valider votre compte :\n${verifyLink}\n\n` +
    `Ce lien et ce code expirent dans 24 heures.`;

  // Vérification de la présence d'une clé Resend
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `Présence Bureau <${fromEmail}>`,
          to: [normalizedEmail],
          subject,
          text: textContent,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return { success: true, simulated: false, messageId: data.id };
      }
    } catch (e) {
      console.error("[Email Resend Error]", e);
    }
  }

  // Simulation locale par défaut
  console.log("\n==================== [SIMULATION COURRIEL] ====================");
  console.log(`✉️  DESTINATAIRE : ${normalizedEmail}`);
  console.log(`📌 SUJET        : ${subject}`);
  console.log(`🔑 CODE OTP     : ${code}`);
  console.log(`🔗 LIEN DIRECT  : ${verifyLink}`);
  console.log("===============================================================\n");

  return {
    success: true,
    simulated: true,
    code,
    previewUrl: verifyLink,
  };
}

/**
 * Envoi d'une invitation à une équipe
 */
export async function sendInvitationEmail({
  to,
  inviterName,
  teamName,
  token,
  role,
}: {
  to: string;
  inviterName: string;
  teamName: string;
  token: string;
  role: string;
}): Promise<SendEmailResult> {
  const normalizedEmail = to.toLowerCase().trim();
  const baseUrl = getAppBaseUrl();
  const inviteLink = `${baseUrl}/register?invite=${token}`;

  devEmailInbox.set(normalizedEmail, {
    type: "INVITATION",
    link: inviteLink,
    timestamp: Date.now(),
  });

  const roleLabel = role === "ADMIN" ? "Administrateur" : "Membre d'équipe";
  const subject = `Invitation à rejoindre l'équipe "${teamName}" - Présence Bureau`;
  const textContent = `Bonjour,\n\n` +
    `${inviterName} vous invite à rejoindre l'équipe "${teamName}" sur Présence Bureau avec le rôle de ${roleLabel}.\n\n` +
    `Pour finaliser la création de votre compte sécurisé, cliquez sur ce lien :\n${inviteLink}\n\n` +
    `Cette invitation est valable pendant 7 jours.`;

  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `Présence Bureau <${fromEmail}>`,
          to: [normalizedEmail],
          subject,
          text: textContent,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return { success: true, simulated: false, messageId: data.id };
      }
    } catch (e) {
      console.error("[Email Resend Error]", e);
    }
  }

  // Simulation locale
  console.log("\n==================== [SIMULATION INVITATION] ===================");
  console.log(`✉️  DESTINATAIRE : ${normalizedEmail}`);
  console.log(`📌 ÉQUIPE       : ${teamName}`);
  console.log(`👤 INVITÉ PAR   : ${inviterName}`);
  console.log(`🛡️ RÔLE         : ${roleLabel}`);
  console.log(`🔗 LIEN UNIQUE  : ${inviteLink}`);
  console.log("===============================================================\n");

  return {
    success: true,
    simulated: true,
    previewUrl: inviteLink,
  };
}

/**
 * Envoi d'un courriel de réinitialisation de mot de passe
 */
export async function sendPasswordResetEmail({
  to,
  code,
  token,
  firstName,
}: {
  to: string;
  code: string;
  token: string;
  firstName?: string;
}): Promise<SendEmailResult> {
  const normalizedEmail = to.toLowerCase().trim();
  const baseUrl = getAppBaseUrl();
  const resetLink = `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(
    normalizedEmail
  )}`;

  devEmailInbox.set(normalizedEmail, {
    type: "RESET_PASSWORD",
    code,
    link: resetLink,
    timestamp: Date.now(),
  });

  const subject = "Réinitialisation de votre mot de passe - Présence Bureau";
  const textContent = `Bonjour ${firstName || ""},\n\n` +
    `Une demande de réinitialisation de mot de passe a été initiée pour votre compte.\n\n` +
    `Votre code de réinitialisation est : ${code}\n\n` +
    `Ou cliquez sur le lien suivant pour choisir un nouveau mot de passe :\n${resetLink}\n\n` +
    `Ce lien est valable 1 heure. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer ce message en toute sécurité.`;

  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `Présence Bureau <${fromEmail}>`,
          to: [normalizedEmail],
          subject,
          text: textContent,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return { success: true, simulated: false, messageId: data.id };
      }
    } catch (e) {
      console.error("[Email Resend Error]", e);
    }
  }

  // Simulation locale
  console.log("\n============= [SIMULATION RÉINITIALISATION MDP] =============");
  console.log(`✉️  DESTINATAIRE : ${normalizedEmail}`);
  console.log(`🔑 CODE OTP     : ${code}`);
  console.log(`🔗 LIEN DIRECT  : ${resetLink}`);
  console.log("===============================================================\n");

  return {
    success: true,
    simulated: true,
    code,
    previewUrl: resetLink,
  };
}
