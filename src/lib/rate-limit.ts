/**
 * Système de limitation de débit (Rate Limiting) en mémoire pour protéger
 * contre les attaques par force brute (connexion, réinitialisation, vérification).
 */

interface RateLimitRecord {
  attempts: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitRecord>();

// Nettoyage régulier pour éviter la fuite de mémoire sans retenir le processus Node
if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of memoryStore.entries()) {
      if (now > record.resetAt) {
        memoryStore.delete(key);
      }
    }
  }, 60000);
  if (timer.unref) {
    timer.unref();
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Vérifie et applique une limite de débit.
 * @param key Clé d'identification (ex: `login:email@domain.com` ou `ip:xxx`)
 * @param maxAttempts Nombre maximal de tentatives autorisées dans la fenêtre
 * @param windowMs Durée de la fenêtre en millisecondes (défaut: 15 minutes)
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000
): RateLimitResult {
  const now = Date.now();
  const record = memoryStore.get(key);

  if (!record || now > record.resetAt) {
    memoryStore.set(key, {
      attempts: 1,
      resetAt: now + windowMs,
    });
    return {
      allowed: true,
      remaining: maxAttempts - 1,
      retryAfterSeconds: 0,
    };
  }

  if (record.attempts >= maxAttempts) {
    const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  record.attempts += 1;
  return {
    allowed: true,
    remaining: maxAttempts - record.attempts,
    retryAfterSeconds: 0,
  };
}

/**
 * Réinitialise le compteur après un succès (ex: mot de passe valide).
 */
export function resetRateLimit(key: string): void {
  memoryStore.delete(key);
}
