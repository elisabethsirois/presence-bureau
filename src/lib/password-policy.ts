/**
 * Module de politique de complexité des mots de passe.
 * Règles :
 * - Minimum 8 caractères
 * - Au moins une lettre majuscule
 * - Au moins une lettre minuscule
 * - Au moins un chiffre
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface PasswordStrengthResult {
  score: number; // 0 à 4
  label: "Très faible" | "Faible" | "Moyen" | "Fort" | "Excellent";
  color: string;
  percent: number;
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (!password || password.length < 8) {
    errors.push("Au moins 8 caractères");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Au moins une majuscule (A-Z)");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Au moins une minuscule (a-z)");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Au moins un chiffre (0-9)");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function getPasswordStrength(password: string): PasswordStrengthResult {
  if (!password) {
    return { score: 0, label: "Très faible", color: "bg-gray-200", percent: 0 };
  }

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  switch (score) {
    case 0:
    case 1:
      return { score: 1, label: "Faible", color: "bg-red-500", percent: 25 };
    case 2:
      return { score: 2, label: "Moyen", color: "bg-amber-500", percent: 50 };
    case 3:
      return { score: 3, label: "Fort", color: "bg-emerald-500", percent: 75 };
    case 4:
    case 5:
    default:
      return { score: 4, label: "Excellent", color: "bg-emerald-600", percent: 100 };
  }
}
