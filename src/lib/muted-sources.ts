// Per-source mute for price alerts.
// Users get alerts on a brand from many sources (retailers, marketplaces,
// forums). Muting a source hides its alerts everywhere without touching
// the brand subscription itself. Frontend-only mock persisted in localStorage.

import { useEffect, useState } from "react";

const KEY = "lux.mutedAlertSources.v1";
const EVT = "muted-alert-sources-change";

/** Best-effort hostname extraction. Strips leading "www.". Returns null for
 *  non-http URLs or malformed inputs. */
export function sourceHostname(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

export function getMutedSources(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function write(next: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(EVT));
  } catch {
    // ignore
  }
}

export function isSourceMuted(host: string | null | undefined): boolean {
  if (!host) return false;
  return getMutedSources().includes(host);
}

export function muteSource(host: string) {
  const cur = getMutedSources();
  if (cur.includes(host)) return;
  write([...cur, host]);
}

export function unmuteSource(host: string) {
  const cur = getMutedSources();
  if (!cur.includes(host)) return;
  write(cur.filter((h) => h !== host));
}

export function useMutedSources(): string[] {
  const [list, setList] = useState<string[]>(() => getMutedSources());
  useEffect(() => {
    const sync = () => setList(getMutedSources());
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return list;
}
