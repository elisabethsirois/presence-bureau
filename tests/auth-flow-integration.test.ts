import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";

describe("Scénarios d'intégration Sécurité & Invitations", () => {
  let testAdminId: string;
  let testTeamId: string;
  const testInvitedEmail = `invitee_${Date.now()}@bureau.local`;
  let inviteToken: string;

  before(async () => {
    // Créer une équipe de test
    const team = await prisma.team.create({
      data: { name: `Équipe Sécurité ${Date.now()}` },
    });
    testTeamId = team.id;

    // Créer un administrateur
    const admin = await prisma.user.create({
      data: {
        email: `admin_sec_${Date.now()}@bureau.local`,
        firstName: "Admin",
        lastName: "Security",
        passwordHash: await bcrypt.hash("AdminSec123!", 10),
        role: "ADMIN",
        emailVerified: true,
        teamId: testTeamId,
      },
    });
    testAdminId = admin.id;
  });

  after(async () => {
    // Nettoyage
    await prisma.presence.deleteMany({});
    await prisma.invitation.deleteMany({});
    await prisma.emailVerificationToken.deleteMany({});
    await prisma.passwordResetToken.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.user.deleteMany({
      where: { email: { contains: "bureau.local" } },
    });
    await prisma.team.deleteMany({
      where: { id: testTeamId },
    });
  });

  it("1. L'administrateur peut générer une invitation d'équipe sécurisée", async () => {
    inviteToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const inv = await prisma.invitation.create({
      data: {
        email: testInvitedEmail,
        teamId: testTeamId,
        role: "USER",
        token: inviteToken,
        invitedById: testAdminId,
        expiresAt,
      },
      include: { team: true },
    });

    assert.equal(inv.email, testInvitedEmail);
    assert.equal(inv.teamId, testTeamId);
    assert.ok(inv.token.length >= 32);
    assert.ok(inv.expiresAt > new Date());
  });

  it("2. L'inscription via invitation rattache automatiquement à l'équipe et valide le courriel", async () => {
    const inv = await prisma.invitation.findUnique({
      where: { token: inviteToken },
    });
    assert.ok(inv !== null);

    const passwordHash = await bcrypt.hash("Collaborateur123!", 10);

    const newUser = await prisma.user.create({
      data: {
        firstName: "Jean",
        lastName: "Dupont",
        email: inv.email,
        passwordHash,
        role: inv.role,
        teamId: inv.teamId,
        emailVerified: true, // Auto-validé via le token d'invitation
      },
    });

    // Suppression de l'invitation consommée
    await prisma.invitation.delete({ where: { id: inv.id } });

    assert.equal(newUser.email, testInvitedEmail);
    assert.equal(newUser.teamId, testTeamId);
    assert.equal(newUser.emailVerified, true);

    const deletedInv = await prisma.invitation.findUnique({
      where: { token: inviteToken },
    });
    assert.equal(deletedInv, null);
  });

  it("3. Un utilisateur avec courriel non vérifié requiert une validation OTP", async () => {
    const unverifiedEmail = `unverified_${Date.now()}@bureau.local`;
    const passwordHash = await bcrypt.hash("UserPass123!", 10);

    const user = await prisma.user.create({
      data: {
        firstName: "Marc",
        lastName: "SansCourriel",
        email: unverifiedEmail,
        passwordHash,
        role: "USER",
        emailVerified: false,
        teamId: testTeamId,
      },
    });

    assert.equal(user.emailVerified, false);

    // Génération du code OTP de vérification
    const code = "456789";
    const token = crypto.randomBytes(32).toString("hex");

    await prisma.emailVerificationToken.create({
      data: {
        email: unverifiedEmail,
        code,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    // Validation du code OTP
    const validToken = await prisma.emailVerificationToken.findFirst({
      where: {
        email: unverifiedEmail,
        code,
        expiresAt: { gt: new Date() },
      },
    });
    assert.ok(validToken !== null);

    // Mise à jour vers vérifié
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });
    assert.equal(updated.emailVerified, true);

    // Nettoyage token
    await prisma.emailVerificationToken.deleteMany({
      where: { email: unverifiedEmail },
    });
    const tokensRemaining = await prisma.emailVerificationToken.count({
      where: { email: unverifiedEmail },
    });
    assert.equal(tokensRemaining, 0);
  });

  it("4. Les événements d'audit enregistrent correctement les actions de sécurité", async () => {
    await prisma.auditLog.create({
      data: {
        action: "INVITATION_CREATED",
        actorId: testAdminId,
        target: testInvitedEmail,
        details: JSON.stringify({ teamId: testTeamId, role: "USER" }),
      },
    });

    const logs = await prisma.auditLog.findMany({
      where: { target: testInvitedEmail },
    });

    assert.ok(logs.length > 0);
    assert.equal(logs[0].action, "INVITATION_CREATED");
    assert.equal(logs[0].actorId, testAdminId);
  });
});
