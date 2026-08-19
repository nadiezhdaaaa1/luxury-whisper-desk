import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import {
  CONSENT_VERSION,
  DEFAULT_CONSENT_PREFS,
  loadConsentRecord,
  saveConsentRecord,
  type ConsentCategory,
  type ConsentPrefs,
  type ConsentRecord,
} from "@/lib/consent-storage";

export { CONSENT_VERSION };
export { hasConsent } from "@/lib/consent-storage";
export type { ConsentCategory, ConsentPrefs, ConsentRecord };

const DEFAULT_PREFS: ConsentPrefs = DEFAULT_CONSENT_PREFS;

function hasGPC(): boolean {
  if (typeof navigator === "undefined") return false;
  return (navigator as unknown as { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
}

const loadRecord = loadConsentRecord;
const saveRecord = saveConsentRecord;

// Non-essential scripts registry (real IDs stubbed — inject real snippets when available).
const loadedScripts = new Set<string>();

function injectScript(id: string, src: string) {
  if (typeof document === "undefined" || loadedScripts.has(id)) return;
  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  s.dataset.consentId = id;
  document.head.appendChild(s);
  loadedScripts.add(id);
}

function removeScripts(ids: string[]) {
  if (typeof document === "undefined") return;
  ids.forEach((id) => {
    document.querySelectorAll(`script[data-consent-id="${id}"]`).forEach((el) => el.remove());
    loadedScripts.delete(id);
  });
  // Clear common analytics/marketing cookies where feasible.
  if (typeof document !== "undefined") {
    const kill = ["_ga", "_gid", "_gat", "_fbp", "_fbc"];
    for (const name of document.cookie.split(";")) {
      const key = name.split("=")[0]?.trim();
      if (!key) continue;
      if (kill.some((k) => key.startsWith(k))) {
        document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      }
    }
  }
}

function applyConsent(prev: ConsentPrefs | null, next: ConsentPrefs) {
  // Analytics
  if (next.analytics && !prev?.analytics) {
    // GA4 / Amplitude / Clarity — replace src values with your real IDs.
    // injectScript("ga4", "https://www.googletagmanager.com/gtag/js?id=G-XXXXX");
    // injectScript("amplitude", "https://cdn.amplitude.com/libs/analytics-browser-2.0.0-min.js.gz");
    // injectScript("clarity", "https://www.clarity.ms/tag/XXXXXX");
  } else if (!next.analytics && prev?.analytics) {
    removeScripts(["ga4", "amplitude", "clarity"]);
  }

  // Marketing
  if (next.marketing && !prev?.marketing) {
    // injectScript("meta-pixel", "https://connect.facebook.net/en_US/fbevents.js");
    // injectScript("google-ads", "https://www.googletagmanager.com/gtag/js?id=AW-XXXXX");
    // injectScript("appsflyer", "https://websdk.appsflyer.com?...");
  } else if (!next.marketing && prev?.marketing) {
    removeScripts(["meta-pixel", "google-ads", "appsflyer"]);
  }
}

interface ConsentContextValue {
  prefs: ConsentPrefs;
  hasRecord: boolean;
  bannerOpen: boolean;
  modalOpen: boolean;
  gpc: boolean;
  acceptAll: () => void;
  rejectAll: () => void;
  savePrefs: (next: ConsentPrefs) => void;
  openPreferences: () => void;
  closePreferences: () => void;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<ConsentPrefs>(DEFAULT_PREFS);
  const [hasRecord, setHasRecord] = useState(false);
  const [bannerOpen, setBannerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [gpc, setGpc] = useState(false);

  useEffect(() => {
    const record = loadRecord();
    const gpcOn = hasGPC();
    setGpc(gpcOn);
    if (record) {
      setPrefs(record.prefs);
      setHasRecord(true);
      applyConsent(null, record.prefs);
    } else {
      // GPC forces marketing (and anything considered "sale/sharing") off by default
      setPrefs({ ...DEFAULT_PREFS, marketing: gpcOn ? false : DEFAULT_PREFS.marketing });
      setBannerOpen(true);
    }

    const onOpen = () => setModalOpen(true);
    window.addEventListener("open-cookie-preferences", onOpen);
    return () => window.removeEventListener("open-cookie-preferences", onOpen);
  }, []);

  const commit = useCallback(
    (next: ConsentPrefs) => {
      const withNecessary: ConsentPrefs = { ...next, necessary: true };
      applyConsent(prefs, withNecessary);
      setPrefs(withNecessary);
      saveRecord(withNecessary);
      setHasRecord(true);
      setBannerOpen(false);
      setModalOpen(false);
    },
    [prefs],
  );

  const acceptAll = useCallback(() => {
    commit({ necessary: true, functional: true, analytics: true, marketing: gpc ? false : true });
  }, [commit, gpc]);

  const rejectAll = useCallback(() => {
    commit({ necessary: true, functional: false, analytics: false, marketing: false });
  }, [commit]);

  const savePrefs = useCallback((next: ConsentPrefs) => commit(next), [commit]);

  const openPreferences = useCallback(() => setModalOpen(true), []);
  const closePreferences = useCallback(() => setModalOpen(false), []);

  return (
    <ConsentContext.Provider
      value={{
        prefs,
        hasRecord,
        bannerOpen,
        modalOpen,
        gpc,
        acceptAll,
        rejectAll,
        savePrefs,
        openPreferences,
        closePreferences,
      }}
    >
      {children}
    </ConsentContext.Provider>
  );
}

export function useConsent() {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error("useConsent must be used within ConsentProvider");
  return ctx;
}

export function openCookiePreferences() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("open-cookie-preferences"));
  }
}
