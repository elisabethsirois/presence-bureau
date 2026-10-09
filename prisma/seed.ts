import { PrismaClient, Role, PresenceStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Début du seed...");

  // Nettoyage préalable (ordre cascade)
  await prisma.presence.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.team.deleteMany({});

  // 1. Création des équipes
  const teamAlpha = await prisma.team.create({
    data: { name: "Équipe Alpha" },
  });

  const teamBeta = await prisma.team.create({
    data: { name: "Équipe Beta" },
  });

  console.log(`✅ Équipes créées : ${teamAlpha.name}, ${teamBeta.name}`);

  // 2. Hash du mot de passe
  const adminPassword = await bcrypt.hash("Admin123!", 10);
  const userPassword = await bcrypt.hash("User123!", 10);

  // 3. Création des utilisateurs initiaux (les 3 collègues du projet original)
  const elisabeth = await prisma.user.create({
    data: {
      email: "admin@bureau.local",
      firstName: "Élisabeth",
      lastName: "Sirois",
      passwordHash: adminPassword,
      role: Role.ADMIN,
      emailVerified: true,
      teamId: teamAlpha.id,
    },
  });

  const frederique = await prisma.user.create({
    data: {
      email: "frederique@bureau.local",
      firstName: "Frédérique",
      lastName: "Bonenfant",
      passwordHash: userPassword,
      role: Role.USER,
      emailVerified: true,
      teamId: teamAlpha.id,
    },
  });

  const allyne = await prisma.user.create({
    data: {
      email: "allyne@bureau.local",
      firstName: "Allyne",
      lastName: "Fernandes",
      passwordHash: userPassword,
      role: Role.USER,
      emailVerified: true,
      teamId: teamAlpha.id,
    },
  });

  // Utilisateur dans l'autre équipe pour tester le cloisonnement
  const marc = await prisma.user.create({
    data: {
      email: "marc@bureau.local",
      firstName: "Marc",
      lastName: "Tremblay",
      passwordHash: userPassword,
      role: Role.USER,
      emailVerified: true,
      teamId: teamBeta.id,
    },
  });

  console.log("✅ Utilisateurs créés :");
  console.log(` - ${elisabeth.firstName} ${elisabeth.lastName} (ADMIN, ${teamAlpha.name})`);
  console.log(` - ${frederique.firstName} ${frederique.lastName} (USER, ${teamAlpha.name})`);
  console.log(` - ${allyne.firstName} ${allyne.lastName} (USER, ${teamAlpha.name})`);
  console.log(` - ${marc.firstName} ${marc.lastName} (USER, ${teamBeta.name})`);

  // 4. Données de présences de test pour le mois en cours
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const todayKey = `${year}-${month}-${day}`;

  await prisma.presence.create({
    data: {
      date: todayKey,
      userId: elisabeth.id,
      amStatus: PresenceStatus.OFFICE,
      pmStatus: PresenceStatus.OFFICE,
    },
  });

  await prisma.presence.create({
    data: {
      date: todayKey,
      userId: frederique.id,
      amStatus: PresenceStatus.REMOTE,
      pmStatus: PresenceStatus.OFFICE,
    },
  });

  await prisma.presence.create({
    data: {
      date: todayKey,
      userId: allyne.id,
      amStatus: PresenceStatus.OFFICE,
      pmStatus: PresenceStatus.REMOTE,
    },
  });

  console.log(`✅ Présences de test insérées pour la date ${todayKey}`);
  console.log("🎉 Seed terminé avec succès !");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });