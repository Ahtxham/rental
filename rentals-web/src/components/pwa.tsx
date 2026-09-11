"use client";

import { Download, WifiOff, X } from "lucide-react";
import { useOffline } from "next/offline";
import { useEffect, useState } from "react";

/**
 * Registers the service worker, once the page has finished the work that
 * matters.
 *
 * Deliberately after `load`: registering during hydration makes the worker's
 * install compete with the first paint on exactly the connection this feature
 * exists to help.
 *
 * **Never in development.** `sw.js` serves `/_next/static/*` cache-first,
 * which is right in production (those URLs are content-hashed, so a cached
 * chunk is never the wrong chunk) and catastrophic in dev, where the dev
 * server reuses those paths for new content: every edit is invisible until
 * somebody thinks to clear site data. Any worker left over from a previous
 * run is torn down here too, along with its caches, otherwise the machine
 * that hit it once keeps hitting it.
 */
export const ServiceWorkerRegistration = () => {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      void (async () => {
        for (const registration of await navigator.serviceWorker.getRegistrations()) {
          await registration.unregister();
        }
        if ("caches" in window) {
          for (const key of await caches.keys()) await caches.delete(key);
        }
      })();
      return;
    }

    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // A failed registration costs offline support and nothing else. The
        // site is fully usable without it, so this must never surface.
      });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
};

/**
 * A bar when the connection goes.
 *
 * `useOffline` comes from Next itself (`experimental.useOffline`), which also
 * retries navigations and actions that were blocked while the connection was
 * down, so this is honest about state rather than being a decorative banner
 * over a page that has quietly stopped working.
 */
export const OfflineBanner = () => {
  const isOffline = useOffline();
  if (!isOffline) return null;

  return (
    <div
      role="status"
      className="sticky top-[57px] z-30 flex items-center justify-center gap-2 bg-action px-4 py-2 text-center text-xs font-semibold text-white"
    >
      <WifiOff className="size-3.5 shrink-0" aria-hidden />
      You are offline. Pages you have opened before will still work.
    </div>
  );
};

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * "Add to home screen", offered rather than nagged.
 *
 * Only appears when the browser has actually fired `beforeinstallprompt`,
 * which it does when the site is installable and the person has used it a
 * little, and once dismissed it stays dismissed for the session. iOS fires
 * nothing at all, so iPhone users simply never see this; that is the platform,
 * not a bug to work around with a tutorial popup nobody reads.
 */
export const InstallPrompt = () => {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!prompt || hidden) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-line bg-card p-4 shadow-lg sm:inset-x-auto sm:end-6">
      <Download className="size-5 shrink-0 text-muted" aria-hidden />
      <p className="flex-1 text-sm text-ink-soft">
        Add Musafir to your home screen for one-tap booking.
      </p>
      <button
        type="button"
        onClick={async () => {
          await prompt.prompt();
          await prompt.userChoice;
          setPrompt(null);
        }}
        className="rounded-full bg-night px-4 py-2 text-xs font-semibold text-paper"
      >
        Add
      </button>
      <button
        type="button"
        onClick={() => setHidden(true)}
        aria-label="Not now"
        className="text-muted transition-colors hover:text-ink"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
};
