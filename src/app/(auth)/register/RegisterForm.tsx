"use client";

import { useActionState } from "react";
import { registerAction, AuthState } from "@/lib/actions/auth";
import Link from "next/link";

interface RegisterFormProps {
  teams: { id: string; name: string }[];
}

export default function RegisterForm({ teams }: RegisterFormProps) {
  const [state, formAction, isPending] = useActionState<AuthState | null, FormData>(
    registerAction,
    null
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg)]">
      <div className="w-full max-w-md bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-sm p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-[var(--text)]">Créer un compte</h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            Rejoignez votre équipe sur Présence Bureau
          </p>
        </div>

        {state?.error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-medium text-[var(--text)] mb-1"
              >
                Prénom
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                required
                placeholder="ex. Élisabeth"
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] bg-white"
              />
            </div>
            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-medium text-[var(--text)] mb-1"
              >
                Nom
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                required
                placeholder="ex. Sirois"
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] bg-white"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-[var(--text)] mb-1"
            >
              Adresse courriel
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="ex. elisabeth@bureau.com"
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] bg-white"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[var(--text)] mb-1"
            >
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="Au moins 6 caractères"
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] bg-white"
            />
          </div>

          <div>
            <label
              htmlFor="teamId"
              className="block text-sm font-medium text-[var(--text)] mb-1"
            >
              Équipe de rattachement
            </label>
            <select
              id="teamId"
              name="teamId"
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] bg-white cursor-pointer"
            >
              <option value="">Sélectionnez une équipe...</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-[var(--muted)] mt-1">
              Vous ne verrez que les présences des collègues de votre équipe.
            </p>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2.5 px-4 bg-[var(--primary)] text-white font-medium rounded-lg hover:opacity-95 transition disabled:opacity-50 text-sm shadow-sm"
          >
            {isPending ? "Création en cours..." : "S'inscrire"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-[var(--muted)]">
          Déjà un compte ?{" "}
          <Link
            href="/login"
            className="text-[var(--primary)] font-medium hover:underline"
          >
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}