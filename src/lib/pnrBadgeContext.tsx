import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchPnrCacheBatch, fetchPnrUsage, type PnrCacheRow, type PnrUsage } from './api';
import { badgeFromStatusJson, type BadgeOverride } from './pnrStatus';

interface PnrBadgeContextValue {
  overrides: Record<string, BadgeOverride>;
  cached: Record<string, PnrCacheRow>;
  /** Update one PNR's cached row in-place (e.g. after a manual Refresh). */
  updatePnr: (pnr: string, row: PnrCacheRow) => void;
  /** RapidAPI quota, shared across all PNR panels and the refresh dialog. */
  usage: PnrUsage[] | null;
  /** Re-fetch usage from the edge function. Call after any refresh that may
   *  have consumed a quota slot. */
  refreshUsage: () => Promise<void>;
  /** Replace usage in-place (e.g. from the usage array on a fresh PNR response,
   *  which carries the authoritative count from RapidAPI's response headers). */
  setUsage: (usage: PnrUsage[]) => void;
}

const PnrBadgeContext = createContext<PnrBadgeContextValue>({
  overrides: {},
  cached: {},
  updatePnr: () => {},
  usage: null,
  refreshUsage: async () => {},
  setUsage: () => {},
});

export function PnrBadgeProvider({ pnrs, children }: { pnrs: string[]; children: ReactNode }) {
  const [cached, setCached] = useState<Record<string, PnrCacheRow>>({});
  const [usage, setUsageState] = useState<PnrUsage[] | null>(null);

  const key = useMemo(() => pnrs.slice().sort().join(','), [pnrs]);

  useEffect(() => {
    let alive = true;
    if (pnrs.length === 0) return;
    fetchPnrCacheBatch(pnrs)
      .then((rows) => {
        if (alive) setCached((prev) => ({ ...rows, ...prev }));
      })
      .catch(() => {
        // Silent — cards fall back to their hardcoded badges.
      });
    return () => {
      alive = false;
    };
  }, [key]);

  const refreshUsage = useCallback(async () => {
    try {
      const u = await fetchPnrUsage();
      setUsageState(u);
    } catch {
      // On failure, drop into an empty-but-known state so consumers stop
      // showing a perpetual "loading" indicator. Treats it as "no info" rather
      // than "haven't tried yet" — the dialog can fall back to letting the
      // user proceed.
      setUsageState((prev) => prev ?? []);
    }
  }, []);

  // Load usage once at mount so the badge area + refresh dialog have data
  // ready before the user clicks anything.
  useEffect(() => {
    void refreshUsage();
  }, [refreshUsage]);

  const setUsage = useCallback((u: PnrUsage[]) => {
    setUsageState(u);
  }, []);

  const updatePnr = useCallback((pnr: string, row: PnrCacheRow) => {
    setCached((prev) => ({ ...prev, [pnr]: row }));
  }, []);

  const overrides = useMemo(() => {
    const out: Record<string, BadgeOverride> = {};
    for (const [pnr, row] of Object.entries(cached)) {
      const o = badgeFromStatusJson(row.status_json);
      if (o) out[pnr] = o;
    }
    return out;
  }, [cached]);

  return (
    <PnrBadgeContext.Provider
      value={{ overrides, cached, updatePnr, usage, refreshUsage, setUsage }}
    >
      {children}
    </PnrBadgeContext.Provider>
  );
}

export function usePnrBadge(pnr: string): BadgeOverride | null {
  return useContext(PnrBadgeContext).overrides[pnr] ?? null;
}

export function usePnrCached(pnr: string): PnrCacheRow | null {
  return useContext(PnrBadgeContext).cached[pnr] ?? null;
}

export function usePnrUpdate(): (pnr: string, row: PnrCacheRow) => void {
  return useContext(PnrBadgeContext).updatePnr;
}

export function usePnrUsage(): {
  usage: PnrUsage[] | null;
  refreshUsage: () => Promise<void>;
  setUsage: (usage: PnrUsage[]) => void;
} {
  const ctx = useContext(PnrBadgeContext);
  return { usage: ctx.usage, refreshUsage: ctx.refreshUsage, setUsage: ctx.setUsage };
}
