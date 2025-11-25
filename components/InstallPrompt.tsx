import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true;

    if (isStandalone) {
      return; // Already installed, don't show prompt
    }

    // Check if dismissed recently (24 hours)
    const dismissedAt = localStorage.getItem('pwa-install-dismissed');
    if (dismissedAt && Date.now() - parseInt(dismissedAt) < 24 * 60 * 60 * 1000) {
      setDismissed(true);
      return;
    }

    // Detect iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIOS) {
      setShowIOSHint(true);
      return;
    }

    // Listen for install prompt (Chrome, Edge, etc.)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setDeferredPrompt(null);
    setShowIOSHint(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Don't show if dismissed or nothing to show
  if (dismissed || (!deferredPrompt && !showIOSHint)) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-foos-panel to-slate-800 border border-slate-700 rounded-xl p-4 mb-6 relative">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 text-slate-500 hover:text-slate-300 transition"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-foos-accent/20 rounded-full flex items-center justify-center flex-shrink-0">
          <Smartphone className="w-5 h-5 text-foos-accent" />
        </div>
        <div className="flex-1 pr-6">
          <h3 className="font-bold text-white text-sm mb-1">Install Foosbournament</h3>
          {showIOSHint ? (
            <p className="text-slate-400 text-xs leading-relaxed">
              Tap the <span className="inline-block px-1 bg-slate-700 rounded text-white">Share</span> button,
              then <span className="text-white font-medium">"Add to Home Screen"</span> for quick access.
            </p>
          ) : (
            <>
              <p className="text-slate-400 text-xs mb-3">
                Install as an app for quick access and offline use.
              </p>
              <button
                onClick={handleInstall}
                className="flex items-center gap-2 bg-foos-accent hover:bg-cyan-400 text-slate-900 font-bold text-xs px-3 py-1.5 rounded-lg transition"
              >
                <Download className="w-3 h-3" />
                Install App
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;
