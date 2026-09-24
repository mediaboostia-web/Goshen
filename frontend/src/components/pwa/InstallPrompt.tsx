'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useToast } from '@/contexts/ToastContext';

// Chrome/Edge/Android fire `beforeinstallprompt`; the type isn't in lib.dom.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_KEY = 'goshen-install-dismissed-at';
const DISMISS_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

function wasRecentlyDismissed(): boolean {
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < DISMISS_COOLDOWN_MS;
  } catch {
    return false;
  }
}

function markDismissed(): void {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // Non-critical — worst case the banner reappears next visit.
  }
}

function isStandalone(): boolean {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

// Android/Chrome gets the real native prompt (`beforeinstallprompt`). Safari
// never fires that event — iOS users only get "Add to Home Screen" via the
// manual Share-sheet route, so they see written steps instead of a button.
function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function InstallPrompt() {
  const { toast } = useToast();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosSteps, setShowIosSteps] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isStandalone() || wasRecentlyDismissed()) return;

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    function handleAppInstalled() {
      setDeferredPrompt(null);
      toast('Goshen est installé sur votre appareil.', 'success');
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [toast]);

  const [iosEligible, setIosEligible] = useState(false);
  useEffect(() => {
    setIosEligible(isIos() && !isStandalone() && !wasRecentlyDismissed());
  }, []);

  function handleDismiss() {
    markDismissed();
    setDismissed(true);
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === 'dismissed') markDismissed();
  }

  if (dismissed) return null;
  const visible = !!deferredPrompt || iosEligible;
  if (!visible) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 sm:left-auto sm:right-4 sm:w-full sm:max-w-sm">
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xl">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl">
            <Image
              src="/icons/icon-192.png"
              alt="Goshen"
              width={40}
              height={40}
              className="h-full w-full object-cover"
            />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-stone-900">Installer Goshen</p>
            {showIosSteps ? (
              <p className="mt-1 text-xs text-stone-600 leading-relaxed">
                Appuyez sur <strong>Partager</strong> (l’icône carrée avec une flèche) dans la barre
                de Safari, puis sur <strong>« Sur l’écran d’accueil »</strong>.
              </p>
            ) : (
              <p className="mt-1 text-xs text-stone-600 leading-relaxed">
                Ajoutez l’application à votre écran d’accueil pour y accéder plus rapidement, comme
                une application installée.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Fermer"
            className="shrink-0 rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {!showIosSteps && (
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-xl border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer"
            >
              Plus tard
            </button>
            <button
              type="button"
              onClick={deferredPrompt ? () => void handleInstall() : () => setShowIosSteps(true)}
              className="rounded-xl bg-emerald-800 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              Installer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
