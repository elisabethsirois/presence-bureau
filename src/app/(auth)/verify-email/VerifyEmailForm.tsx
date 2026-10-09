"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import {
  verifyEmailAction,
  resendVerificationAction,
  getLatestSimulatedCodeAction,
  AuthState,
} from "@/lib/actions/auth";
import Link from "next/link";
import { MailCheck, KeyRound, ArrowRight, RotateCcw, ShieldCheck, Info } from "lucide-react";

export default function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";
  const initialToken = searchParams.get("token") || "";

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [devSimulation, setDevSimulation] = useState<{
    code?: string;
    link?: string;
  } | null>(null);

  const [state, formAction, isPending] = useActionState<AuthState | null, FormData>(
    verifyEmailAction,
    null
  );

  const [resendState, setResendState] = useState<{ message?: string; error?: string } | null>(
    null
  );
  const [isResending, startResendTransition] = useTransition();
  const [resendCooldown, setResendCooldown] = useState(0);

  // Vérifier si un code simulé existe en dev
  useEffect(() => {
    if (email) {
      getLatestSimulatedCodeAction(email).then((sim) => {
        if (sim) setDevSimulation(sim);
      });
    }
  }, [email]);

  // Compte à rebours pour le renvoi de code
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleResend = () => {
    if (!email || resendCooldown > 0) return;
    startResendTransition(async () => {
      const fd = new FormData();
      fd.append("email", email);
      const res = await resendVerificationAction(null, fd);
      if (res?.error) {
        setResendState({ error: res.error });
      } else {
        setResendState({ message: res?.message || "Nouveau code envoyé !" });
        setResendCooldown(60);
        // Actualiser la simulation dev
        getLatestSimulatedCodeAction(email).then((sim) => {
          if (sim) setDevSimulation(sim);
        });
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg)]">
      <div className="w-full max-w-md bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-sm p-8">
        <div className="mb-6 text-center">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <MailCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Vérification de courriel</h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            Saisissez le code à 6 chiffres reçu pour sécuriser et activer votre compte
          </p>
        </div>

        {/* Bannière de développement / simulation */}
        {devSimulation && (
          <div className="mb-4 p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-800">Mode Développement (Simulation locale)</p>
              <p className="mt-0.5">
                Code OTP détecté :{" "}
                <button
                  type="button"
                  onClick={() => setCode(devSimulation.code || "")}
                  className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-blue-300 text-blue-900 underline hover:bg-blue-50"
                  title="Cliquer pour remplir automatiquement"
                >
                  {devSimulation.code}
                </button>{" "}
                <span className="text-[11px] text-blue-700">(cliquez pour insérer)</span>
              </p>
            </div>
          </div>
        )}

        {state?.error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {state.error}
          </div>
        )}

        {resendState?.error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {resendState.error}
          </div>
        )}

        {resendState?.message && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg">
            {resendState.message}
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="token" value={initialToken} />

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

          <div>
            <label
              htmlFor="code"
              className="block text-sm font-medium text-[var(--text)] mb-1"
            >
              Code de vérification (6 chiffres)
            </label>
            <div className="relative">
              <input
                id="code"
                name="code"
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-full px-3 py-2.5 font-mono text-center tracking-widest text-lg font-bold border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] bg-white"
              />
              <KeyRound className="w-4 h-4 text-gray-400 absolute right-3 top-3.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2.5 px-4 bg-[var(--primary)] text-white font-medium rounded-lg hover:opacity-95 transition disabled:opacity-50 text-sm shadow-sm flex items-center justify-center gap-1.5"
          >
            {isPending ? (
              "Vérification..."
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Valider mon compte</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-[var(--border)] flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending || resendCooldown > 0 || !email}
            className="text-xs text-[var(--primary)] font-medium hover:underline flex items-center gap-1 disabled:text-gray-400 disabled:no-underline"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {resendCooldown > 0
              ? `Renvoyer un code (${resendCooldown}s)`
              : "Renvoyer un code de vérification"}
          </button>

          <Link
            href="/login"
            className="text-xs text-[var(--muted)] hover:text-[var(--text)] transition"
          >
            Retourner à la page de connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
