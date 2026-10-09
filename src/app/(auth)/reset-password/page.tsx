import { Suspense } from "react";
import ResetPasswordForm from "./ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg)] text-sm text-[var(--muted)]">
          Chargement de la réinitialisation...
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
