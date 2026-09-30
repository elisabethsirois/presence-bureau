import { Suspense } from "react";
import VerifyEmailForm from "./VerifyEmailForm";

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg)] text-sm text-[var(--muted)]">
          Chargement de la page de vérification...
        </div>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}
