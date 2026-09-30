"use client";

import { useActionState, useState } from "react";
import { requestPasswordResetAction, getLatestSimulatedCodeAction, AuthState } from "@/lib/actions/auth";
import Link from "next/link";
import { KeyRound, ArrowLeft, Send, CheckCircle2, Info } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [devSimulation, setDevSimulation] = useState<{ code?: string; link?: string } | null>(null);

  const [state, formAction, isPending] = useActionState<AuthState | null, FormData>(
    async (prev, fd) => {
      const res = await requestPasswordResetAction(prev, fd);
      const emailVal = fd.get("email")?.toString().trim().toLowerCase();
      if (emailVal) {
        getLatestSimulatedCodeAction(emailVal).then((sim) => {
          if (sim) setDevSimulation(sim);
        });
      }
      return res;
    },
    null
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg)]">
      <div className="w-full max-w-md bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-sm p-8">
        <div className="mb-6 text-center">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Mot de passe oublié</h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            Indiquez votre adresse courriel pour recevoir les instructions de réinitialisation
          </p>
        </div>

        {state?.error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {state.error}
          </div>
        )}

        {state?.message && (
          <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Demande prise en compte</p>
              <p className="text-xs text-emerald-700 mt-0.5">{state.message}</p>
            </div>
          </div>
        )}

        {/* Aide simulation locale en dev */}
        {devSimulation && (
          <div className="mb-4 p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-800">Mode Développement (Simulation locale)</p>
              <p className="mt-0.5">
                Code OTP : <span className="font-mono font-bold">{devSimulation.code}</span>
              </p>
              {devSimulation.link && (
                <Link
                  href={devSimulation.link}
                  className="inline-block mt-1 font-semibold text-blue-700 underline hover:text-blue-900"
                >
                  Ouvrir la page de réinitialisation directement ➔
                </Link>
              )}
            </div>
          </div>
        )}

        <form action={formAction} className="space-y-4">
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ex. nom@bureau.com"
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] bg-white"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2.5 px-4 bg-[var(--primary)] text-white font-medium rounded-lg hover:opacity-95 transition disabled:opacity-50 text-sm shadow-sm flex items-center justify-center gap-1.5"
          >
            {isPending ? (
              "Envoi en cours..."
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Envoyer le lien</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-[var(--muted)]">
          <Link
            href="/login"
            className="text-[var(--primary)] font-medium hover:underline inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
