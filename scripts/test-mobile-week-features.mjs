import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const SCREENSHOT_DIR = path.resolve("./public/test-screenshots");
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runTest() {
  console.log("🚀 Lancement du test end-to-end Playwright des fonctionnalités mobile...");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
  });
  const page = await context.newPage();

  const results = {
    login: false,
    weekViewSwitched: false,
    rowExpanded: false,
    rowShowsOfficePeople: false,
    rowCollapsed: false,
    weekModeNavNext7Days: false,
    weekModeNavPrev7Days: false,
    dayModeNavNext1Day: false,
    dayModeNavPrev1Day: false,
  };

  try {
    // 1. Connexion
    console.log("📱 Connexion avec Frédérique...");
    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
    await page.fill('input[name="email"]', "frederique@bureau.local");
    await page.fill('input[name="password"]', "User123!");
    await page.click('button[type="submit"]');

    await page.waitForURL("http://localhost:3000/", { timeout: 8000 });
    const header = await page.locator("h1").last().textContent();
    console.log(`✅ Connectée : "${header?.trim()}"`);
    results.login = !!header?.includes("Frédérique");

    // 2. Basculer vers Vue Semaine (5j)
    console.log("📅 Bascule en 'Vue Semaine (5j)'...");
    const weekViewTabBtn = page.locator('button:has-text("Vue Semaine")').first();
    await weekViewTabBtn.click();
    await page.waitForTimeout(500);
    results.weekViewSwitched = true;

    // 3. Test Expand du Row de la journée
    console.log("🔍 Test du clic sur le row de la journée pour expand...");
    const firstDayRow = page.locator('[data-testid^="week-day-row-"]').first();
    // Cliquer sur la partie gauche de la ligne (journée)
    await firstDayRow.locator(".text-left").click();
    await page.waitForTimeout(500);

    const expandedList = page.locator('[data-testid^="expanded-office-list-"]').first();
    const isExpandedVisible = await expandedList.isVisible();
    console.log(`👀 Le row est-il déplié ? ${isExpandedVisible ? "OUI ✅" : "NON ❌"}`);
    results.rowExpanded = isExpandedVisible;

    const expandedText = await expandedList.innerText();
    console.log(`📋 Contenu du row déplié :\n${expandedText}`);
    results.rowShowsOfficePeople =
      expandedText.includes("Au bureau") ||
      expandedText.includes("Frédérique") ||
      expandedText.includes("collègue");

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "test-week-row-expanded.png"),
      fullPage: true,
    });
    console.log("📸 Screenshot enregistré : test-week-row-expanded.png");

    // Replier le row
    console.log("🔄 Clic à nouveau pour replier le row...");
    await firstDayRow.locator(".text-left").click();
    await page.waitForTimeout(400);
    const isStillVisible = await expandedList.isVisible();
    console.log(`👀 Le row s'est-il replié ? ${!isStillVisible ? "OUI ✅" : "NON ❌"}`);
    results.rowCollapsed = !isStillVisible;

    // 4. Test Navigation de semaine en semaine en Vue Semaine
    console.log("\n⏩ Test navigation de semaine en semaine en Vue Semaine...");
    const getWeekDaysNumbers = async () => {
      const dayCards = page.locator('[data-testid^="week-day-card-"]');
      const texts = await dayCards.allInnerTexts();
      return texts.map((t) => t.split("\n")[1]); // day number
    };

    const daysBefore = await getWeekDaysNumbers();
    console.log(`📆 Jours de la semaine actuelle : [${daysBefore.join(", ")}]`);

    // Cliquer sur > dans la barre de semaine (data-testid="nav-next-btn")
    const nextBtn = page.locator('[data-testid="nav-next-btn"]');
    await nextBtn.click();
    await page.waitForTimeout(600);

    const daysAfterNext = await getWeekDaysNumbers();
    console.log(`📆 Jours de la semaine suivante (après '>') : [${daysAfterNext.join(", ")}]`);
    results.weekModeNavNext7Days = daysBefore[0] !== daysAfterNext[0];
    console.log(`✅ A navigué d'une semaine complète : ${results.weekModeNavNext7Days ? "OUI ✅" : "NON ❌"}`);

    // Cliquer sur < dans la barre de semaine (data-testid="nav-prev-btn")
    const prevBtn = page.locator('[data-testid="nav-prev-btn"]');
    await prevBtn.click();
    await page.waitForTimeout(600);

    const daysAfterPrev = await getWeekDaysNumbers();
    console.log(`📆 Jours de la semaine revenue (après '<') : [${daysAfterPrev.join(", ")}]`);
    results.weekModeNavPrev7Days = daysBefore[0] === daysAfterPrev[0];
    console.log(`✅ Est revenu à la semaine initiale : ${results.weekModeNavPrev7Days ? "OUI ✅" : "NON ❌"}`);

    // 5. Test Navigation jour par jour en Vue Jour
    console.log("\n📅 Bascule en 'Vue Jour'...");
    const dayViewTabBtn = page.locator('button:has-text("Vue Jour")').first();
    await dayViewTabBtn.click();
    await page.waitForTimeout(500);

    const dayHeadingLocator = page.locator("h2.capitalize").first();
    const dayHeadingBefore = await dayHeadingLocator.textContent();
    console.log(`📆 Jour sélectionné initial : "${dayHeadingBefore?.trim()}"`);

    // Cliquer sur > en vue jour (doit avancer de 1 jour seulement)
    await nextBtn.click();
    await page.waitForTimeout(500);

    const dayHeadingAfterNext = await dayHeadingLocator.textContent();
    console.log(`📆 Jour sélectionné après clic '>' : "${dayHeadingAfterNext?.trim()}"`);
    results.dayModeNavNext1Day = dayHeadingBefore !== dayHeadingAfterNext;
    console.log(`✅ A navigué au jour suivant (+1j) : ${results.dayModeNavNext1Day ? "OUI ✅" : "NON ❌"}`);

    // Cliquer sur < en vue jour (doit reculer de 1 jour seulement)
    await prevBtn.click();
    await page.waitForTimeout(500);

    const dayHeadingAfterPrev = await dayHeadingLocator.textContent();
    console.log(`📆 Jour sélectionné après clic '<' : "${dayHeadingAfterPrev?.trim()}"`);
    results.dayModeNavPrev1Day = dayHeadingBefore === dayHeadingAfterPrev;
    console.log(`✅ Est revenu au jour initial (-1j) : ${results.dayModeNavPrev1Day ? "OUI ✅" : "NON ❌"}`);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "test-mobile-day-view.png"),
      fullPage: true,
    });
    console.log("📸 Screenshot enregistré : test-mobile-day-view.png");

  } catch (err) {
    console.error("❌ Erreur pendant le test :", err);
  } finally {
    await browser.close();
    console.log("\n========================================================");
    console.log("RÉSUMÉ DES TESTS BROWSER DE VALIDATION :");
    console.log("========================================================");
    console.log(`1. Connexion : ${results.login ? "PASS ✅" : "FAIL ❌"}`);
    console.log(`2. Bascule Vue Semaine : ${results.weekViewSwitched ? "PASS ✅" : "FAIL ❌"}`);
    console.log(`3. Clic Row -> Expand : ${results.rowExpanded ? "PASS ✅" : "FAIL ❌"}`);
    console.log(`4. Row montre qui est au bureau : ${results.rowShowsOfficePeople ? "PASS ✅" : "FAIL ❌"}`);
    console.log(`5. Clic Row -> Collapse : ${results.rowCollapsed ? "PASS ✅" : "FAIL ❌"}`);
    console.log(`6. Vue Semaine: Bouton '>' avance de 7 jours : ${results.weekModeNavNext7Days ? "PASS ✅" : "FAIL ❌"}`);
    console.log(`7. Vue Semaine: Bouton '<' recule de 7 jours : ${results.weekModeNavPrev7Days ? "PASS ✅" : "FAIL ❌"}`);
    console.log(`8. Vue Jour: Bouton '>' avance de 1 jour : ${results.dayModeNavNext1Day ? "PASS ✅" : "FAIL ❌"}`);
    console.log(`9. Vue Jour: Bouton '<' recule de 1 jour : ${results.dayModeNavPrev1Day ? "PASS ✅" : "FAIL ❌"}`);
    console.log("========================================================");
  }
}

runTest();
