import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runTeamIsolationVerification() {
  console.log("==============================================================");
  console.log("🧪 VÉRIFICATION APPROFONDIE DU CLOISONNEMENT STRICT PAR ÉQUIPE");
  console.log("==============================================================");

  // 1. Récupération des données brutes en base pour comparer
  const alphaTeam = await prisma.team.findFirst({
    where: { name: "Équipe Alpha" },
    include: { members: true },
  });

  const betaTeam = await prisma.team.findFirst({
    where: { name: "Équipe Beta" },
    include: { members: true },
  });

  const alphaMemberNames = alphaTeam.members.map((m) => `${m.firstName} ${m.lastName}`);
  const betaMemberNames = betaTeam.members.map((m) => `${m.firstName} ${m.lastName}`);

  console.log("\n📋 Données en base :");
  console.log(`- Équipe Alpha (${alphaMemberNames.length} membres) :`, alphaMemberNames.join(", "));
  console.log(`- Équipe Beta (${betaMemberNames.length} membres) :`, betaMemberNames.join(", "));

  const browser = await chromium.launch({ headless: true });

  const checks = [];

  try {
    // -------------------------------------------------------------
    // TEST 1 : VUE MOBILE - Membre de l'Équipe Alpha (Frédérique)
    // -------------------------------------------------------------
    console.log("\n📱 [TEST 1 : MOBILE - Équipe Alpha (Frédérique)]");
    const ctxAlphaMobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: "iPhone iOS 17",
    });
    const pageAlphaMobile = await ctxAlphaMobile.newPage();
    await pageAlphaMobile.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
    await pageAlphaMobile.fill('input[name="email"]', "frederique@bureau.local");
    await pageAlphaMobile.fill('input[name="password"]', "User123!");
    await pageAlphaMobile.click('button[type="submit"]');
    await pageAlphaMobile.waitForURL("http://localhost:3000/", { timeout: 8000 });
    await pageAlphaMobile.waitForTimeout(1000);

    const alphaMobileHtml = await pageAlphaMobile.content();

    // Vérifier que tous les membres de Beta sont ABSENTS
    let leakedBetaInAlpha = betaMemberNames.filter((name) => alphaMobileHtml.includes(name));
    const test1Passed = leakedBetaInAlpha.length === 0;
    console.log(`- Membres d'Équipe Beta trouvés chez Frédérique : ${leakedBetaInAlpha.length} (${leakedBetaInAlpha.join(", ") || "AUCUN ✅"})`);
    checks.push({ name: "Mobile Frédérique (Alpha) : Zéro fuite de l'Équipe Beta", pass: test1Passed });

    // Vérifier que Frédérique voit bien ses propres coéquipiers d'Alpha
    let alphaVisibleInAlpha = alphaMemberNames.filter((name) => alphaMobileHtml.includes(name));
    console.log(`- Membres d'Équipe Alpha visibles chez Frédérique : ${alphaVisibleInAlpha.length}/${alphaMemberNames.length} (${alphaVisibleInAlpha.join(", ")})`);
    checks.push({ name: "Mobile Frédérique (Alpha) : Voit les membres d'Alpha", pass: alphaVisibleInAlpha.length > 0 });

    // -------------------------------------------------------------
    // TEST 2 : ONGLET ÉQUIPE MOBILE - Frédérique
    // -------------------------------------------------------------
    console.log("\n👥 [TEST 2 : MOBILE - Onglet Équipe (Frédérique)]");
    const teamTabBtn = pageAlphaMobile.locator('button:has-text("Équipe")').last();
    await teamTabBtn.click();
    await pageAlphaMobile.waitForTimeout(1000);

    const alphaTeamTabHtml = await pageAlphaMobile.content();
    let leakedBetaInTeamTab = betaMemberNames.filter((name) => alphaTeamTabHtml.includes(name));
    const test2Passed = leakedBetaInTeamTab.length === 0;
    console.log(`- Membres de Beta dans l'onglet Équipe de Frédérique : ${leakedBetaInTeamTab.length} (${leakedBetaInTeamTab.join(", ") || "AUCUN ✅"})`);
    checks.push({ name: "Onglet Équipe Frédérique : Zéro fuite de Beta", pass: test2Passed });

    await ctxAlphaMobile.close();

    // -------------------------------------------------------------
    // TEST 3 : VUE MOBILE - Membre de l'Équipe Beta (Marc)
    // -------------------------------------------------------------
    console.log("\n📱 [TEST 3 : MOBILE - Équipe Beta (Marc)]");
    const ctxBetaMobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: "iPhone iOS 17",
    });
    const pageBetaMobile = await ctxBetaMobile.newPage();
    await pageBetaMobile.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
    await pageBetaMobile.fill('input[name="email"]', "marc@bureau.local");
    await pageBetaMobile.fill('input[name="password"]', "User123!");
    await pageBetaMobile.click('button[type="submit"]');
    await pageBetaMobile.waitForURL("http://localhost:3000/", { timeout: 8000 });
    await pageBetaMobile.waitForTimeout(1000);

    const betaMobileHtml = await pageBetaMobile.content();

    // Vérifier que tous les membres d'Alpha sont ABSENTS
    let leakedAlphaInBeta = alphaMemberNames.filter((name) => betaMobileHtml.includes(name));
    const test3Passed = leakedAlphaInBeta.length === 0;
    console.log(`- Membres d'Équipe Alpha trouvés chez Marc : ${leakedAlphaInBeta.length} (${leakedAlphaInBeta.join(", ") || "AUCUN ✅"})`);
    checks.push({ name: "Mobile Marc (Beta) : Zéro fuite de l'Équipe Alpha", pass: test3Passed });

    // Vérifier que Marc se voit lui-même
    const marcVisible = betaMobileHtml.includes("Marc Tremblay");
    console.log(`- Marc voit-il son propre profil : ${marcVisible ? "OUI ✅" : "NON ❌"}`);
    checks.push({ name: "Mobile Marc (Beta) : Voit son profil", pass: marcVisible });

    await ctxBetaMobile.close();

    // -------------------------------------------------------------
    // TEST 4 : VUE BUREAU / DESKTOP (Grille Mensuelle) - Frédérique
    // -------------------------------------------------------------
    console.log("\n🖥️ [TEST 4 : DESKTOP (Grille Mensuelle) - Équipe Alpha]");
    const ctxAlphaDesktop = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    const pageAlphaDesktop = await ctxAlphaDesktop.newPage();
    await pageAlphaDesktop.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
    await pageAlphaDesktop.fill('input[name="email"]', "frederique@bureau.local");
    await pageAlphaDesktop.fill('input[name="password"]', "User123!");
    await pageAlphaDesktop.click('button[type="submit"]');
    await pageAlphaDesktop.waitForURL("http://localhost:3000/", { timeout: 8000 });
    await pageAlphaDesktop.waitForTimeout(1000);

    const alphaDesktopHtml = await pageAlphaDesktop.content();
    let leakedBetaInDesktop = betaMemberNames.filter((name) => alphaDesktopHtml.includes(name));
    const test4Passed = leakedBetaInDesktop.length === 0;
    console.log(`- Membres de Beta dans la grille Desktop de Frédérique : ${leakedBetaInDesktop.length} (${leakedBetaInDesktop.join(", ") || "AUCUN ✅"})`);
    checks.push({ name: "Desktop Frédérique (Alpha) : Zéro fuite de Beta", pass: test4Passed });

    await ctxAlphaDesktop.close();

    // -------------------------------------------------------------
    // TEST 5 : VUE BUREAU / DESKTOP (Grille Mensuelle) - Marc
    // -------------------------------------------------------------
    console.log("\n🖥️ [TEST 5 : DESKTOP (Grille Mensuelle) - Équipe Beta]");
    const ctxBetaDesktop = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    const pageBetaDesktop = await ctxBetaDesktop.newPage();
    await pageBetaDesktop.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
    await pageBetaDesktop.fill('input[name="email"]', "marc@bureau.local");
    await pageBetaDesktop.fill('input[name="password"]', "User123!");
    await pageBetaDesktop.click('button[type="submit"]');
    await pageBetaDesktop.waitForURL("http://localhost:3000/", { timeout: 8000 });
    await pageBetaDesktop.waitForTimeout(1000);

    const betaDesktopHtml = await pageBetaDesktop.content();
    let leakedAlphaInBetaDesktop = alphaMemberNames.filter((name) => betaDesktopHtml.includes(name));
    const test5Passed = leakedAlphaInBetaDesktop.length === 0;
    console.log(`- Membres d'Alpha dans la grille Desktop de Marc : ${leakedAlphaInBetaDesktop.length} (${leakedAlphaInBetaDesktop.join(", ") || "AUCUN ✅"})`);
    checks.push({ name: "Desktop Marc (Beta) : Zéro fuite d'Alpha", pass: test5Passed });

    await ctxBetaDesktop.close();

  } catch (err) {
    console.error("❌ Erreur pendant le test :", err);
  } finally {
    await browser.close();
    await prisma.$disconnect();

    console.log("\n==============================================================");
    console.log("📊 BILAN DU CLOISONNEMENT PAR ÉQUIPE :");
    console.log("==============================================================");
    let allPass = true;
    for (const c of checks) {
      console.log(`${c.pass ? "✅ PASS" : "❌ FAIL"} - ${c.name}`);
      if (!c.pass) allPass = false;
    }
    console.log("==============================================================");
    console.log(`RÉSULTAT GLOBAL : ${allPass ? "PARFAITEMENT ÉTANCE & CLOISONNÉ (100% PASS) 🎉" : "ÉCHEC"}`);
  }
}

runTeamIsolationVerification();
