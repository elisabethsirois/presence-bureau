"use client";

import { useState, useEffect } from "react";
import { Download, X, Share2, PlusSquare, Smartphone, CheckCircle2 } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface InstallPwaPromptProps {
  forceOpen?: boolean;
  onClose?: () => void;
  showFloatingBanner?: boolean;
}

export default function InstallPwaPrompt({
  forceOpen = false,
  onClose,
  showFloatingBanner = true,
}: InstallPwaPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    // Check if app is in standalone mode (already installed)
    const checkStandalone = () => {
      const isStandaloneMedia = window.matchMedia("(display-mode: standalone)").matches;
      const isIosStandalone = (navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsStandalone(isStandaloneMedia || isIosStandalone);
    };

    checkStandalone();

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIos(isIosDevice);

    // Capture Chromium install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (forceOpen) {
      setShowModal(true);
    }
  }, [forceOpen]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setShowModal(false);
      }
    } else {
      // Show instructional modal (especially for iOS or instructions)
      setShowModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    if (onClose) onClose();
  };

  // If already running standalone, don't show the floating banner
  const canShowBanner = showFloatingBanner && !isStandalone && !bannerDismissed;

  return (
    <>
      {/* Floating Bottom / Top Install Banner for Mobile */}
      {canShowBanner && (
        <aside
          aria-label="Installation de l'application"
          className="fixed bottom-20 left-4 right-4 z-40 max-w-md mx-auto bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3.5 rounded-2xl shadow-xl border border-blue-400/30 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 border border-white/30">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div className="truncate">
              <h2 className="text-xs font-bold leading-tight">Installer l&apos;application</h2>
              <p className="text-[11px] text-blue-100 truncate">
                Accès direct sans passer par l&apos;App Store
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 bg-white text-blue-700 font-bold text-xs rounded-xl shadow-sm hover:bg-blue-50 active:scale-95 transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Installer</span>
            </button>
            <button
              onClick={() => setBannerDismissed(true)}
              className="p-1.5 text-blue-200 hover:text-white rounded-lg transition"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}

      {/* Instructional Modal (Chromium / iOS instructions) */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div
            className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-gray-100 animate-in fade-in slide-in-from-bottom-8 duration-200"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base leading-tight">
                    Installer Présence Bureau
                  </h3>
                  <p className="text-xs text-gray-500">Application web progressive (PWA)</p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isStandalone ? (
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-center my-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                <h4 className="font-bold text-emerald-900 text-sm">Application déjà installée</h4>
                <p className="text-xs text-emerald-700 mt-1">
                  Vous utilisez actuellement la version installée sur votre appareil.
                </p>
              </div>
            ) : isIos ? (
              /* Instructions Spécifiques iOS Safari */
              <div className="space-y-3.5 my-2">
                <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100 text-xs text-blue-900">
                  <p className="font-semibold mb-1">Sur iPhone / iPad (Safari) :</p>
                  <p className="text-[11.5px] leading-relaxed">
                    Cette application s&apos;installe directement depuis votre navigateur en 3 étapes :
                  </p>
                </div>

                <div className="space-y-2.5 text-xs text-gray-700">
                  <div className="flex items-start gap-3 p-2.5 bg-gray-50 rounded-xl">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <div className="leading-snug">
                      Touchez le bouton de partage{" "}
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-200 font-semibold text-[11px]">
                        <Share2 className="w-3 h-3 inline mr-1 text-blue-600" /> Partager
                      </span>{" "}
                      dans la barre du navigateur Safari.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 bg-gray-50 rounded-xl">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <div className="leading-snug">
                      Faites défiler et sélectionnez{" "}
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-200 font-semibold text-[11px]">
                        <PlusSquare className="w-3 h-3 inline mr-1 text-gray-800" /> Sur l&apos;écran
                        d&apos;accueil
                      </span>
                      .
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 bg-gray-50 rounded-xl">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <div className="leading-snug">
                      Touchez <strong className="text-gray-900 font-semibold">Ajouter</strong> en
                      haut à droite. L&apos;icône de l&apos;application apparaîtra avec vos autres apps !
                    </div>
                  </div>
                </div>
              </div>
            ) : deferredPrompt ? (
              /* Installation 1-Click Chromium (Android / PC) */
              <div className="space-y-4 my-3 text-center">
                <p className="text-xs text-gray-600 leading-relaxed">
                  Ajoutez l&apos;application sur votre écran d&apos;accueil pour un accès instantané en plein
                  écran, sans barre d&apos;adresse ni passage par le Google Play Store ou l&apos;App Store.
                </p>

                <button
                  onClick={handleInstallClick}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-blue-500/25 active:scale-98 transition flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Installer sur cet appareil</span>
                </button>
              </div>
            ) : (
              /* Guide Général */
              <div className="space-y-3 my-2 text-xs text-gray-600">
                <p className="leading-relaxed">
                  Pour installer l&apos;application sur votre écran d&apos;accueil :
                </p>
                <div className="p-3 bg-gray-50 rounded-xl space-y-2">
                  <p>
                    <strong>Sur Android / Chrome :</strong> Ouvrez le menu du navigateur (⋮) et
                    choisissez <em>&ldquo;Installer l&apos;application&rdquo;</em> ou{" "}
                    <em>&ldquo;Ajouter à l&apos;écran d&apos;accueil&rdquo;</em>.
                  </p>
                  <p>
                    <strong>Sur iPhone / Safari :</strong> Touchez le bouton Partager puis{" "}
                    <em>&ldquo;Sur l&apos;écran d&apos;accueil&rdquo;</em>.
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={handleCloseModal}
              className="w-full mt-4 py-2.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
}
