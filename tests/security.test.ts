import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validatePassword, getPasswordStrength } from "../src/lib/password-policy";
import { checkRateLimit, resetRateLimit } from "../src/lib/rate-limit";

describe("Politique de mot de passe & Sécurité (Unit Tests)", () => {
  describe("validatePassword", () => {
    it("valide un mot de passe robuste respectant tous les critères", () => {
      const res = validatePassword("Bureau2026!");
      assert.equal(res.isValid, true);
      assert.equal(res.errors.length, 0);
    });

    it("rejette un mot de passe de moins de 8 caractères", () => {
      const res = validatePassword("Abc1!");
      assert.equal(res.isValid, false);
      assert.ok(res.errors.includes("Au moins 8 caractères"));
    });

    it("rejette un mot de passe sans majuscule", () => {
      const res = validatePassword("bureau2026!");
      assert.equal(res.isValid, false);
      assert.ok(res.errors.includes("Au moins une majuscule (A-Z)"));
    });

    it("rejette un mot de passe sans minuscule", () => {
      const res = validatePassword("BUREAU2026!");
      assert.equal(res.isValid, false);
      assert.ok(res.errors.includes("Au moins une minuscule (a-z)"));
    });

    it("rejette un mot de passe sans chiffre", () => {
      const res = validatePassword("BureauSuperMot!");
      assert.equal(res.isValid, false);
      assert.ok(res.errors.includes("Au moins un chiffre (0-9)"));
    });
  });

  describe("getPasswordStrength", () => {
    it("calcule un score faible pour un mot de passe court ou simple", () => {
      const res = getPasswordStrength("abc");
      assert.ok(res.score <= 1);
      assert.equal(res.label, "Faible");
    });

    it("calcule un score moyen pour 8 caractères basiques", () => {
      const res = getPasswordStrength("bureau12");
      assert.ok(res.score >= 2);
    });

    it("calcule un score fort pour un mot de passe complet", () => {
      const res = getPasswordStrength("BureauSecurise2026!");
      assert.ok(res.score >= 3);
      assert.ok(res.percent >= 75);
    });
  });
});

describe("Limitation de débit Anti-Bruteforce (Rate Limiting)", () => {
  it("autorise les requêtes en deçà du seuil maximal", () => {
    const key = `test_key_${Date.now()}`;
    const res1 = checkRateLimit(key, 3, 5000);
    assert.equal(res1.allowed, true);
    assert.equal(res1.remaining, 2);

    const res2 = checkRateLimit(key, 3, 5000);
    assert.equal(res2.allowed, true);
    assert.equal(res2.remaining, 1);
  });

  it("bloque la requête lorsque le seuil est dépassé", () => {
    const key = `test_block_${Date.now()}`;
    checkRateLimit(key, 2, 5000); // 1ère
    checkRateLimit(key, 2, 5000); // 2ème (atteint)
    const blocked = checkRateLimit(key, 2, 5000); // 3ème

    assert.equal(blocked.allowed, false);
    assert.equal(blocked.remaining, 0);
    assert.ok(blocked.retryAfterSeconds > 0);
  });

  it("réinitialise le compteur après appel à resetRateLimit", () => {
    const key = `test_reset_${Date.now()}`;
    checkRateLimit(key, 2, 5000);
    checkRateLimit(key, 2, 5000);

    resetRateLimit(key);

    const afterReset = checkRateLimit(key, 2, 5000);
    assert.equal(afterReset.allowed, true);
    assert.equal(afterReset.remaining, 1);
  });
});
