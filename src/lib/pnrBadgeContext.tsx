import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchPnrCacheBatch, type PnrCacheRow } from './api';
import { badgeFromStatusJson, type BadgeOverride } from './pnrStatus';

interface PnrBadgeContextValue {
  overrides: Record<string, BadgeOverride>;
  cached: Record<string, PnrCacheRow>;
  /** Update one PNR's cached row in-place (e.g. after a manual Refresh). */
  updatePnr: (pnr: string, row: PnrCacheRow) => void;
}

const PnrBadgeContext = createContext<PnrBadgeContextValue>({
  overrides: {},
  cached: {},
  updatePnr: () => {},
});

export function PnrBadgeProvider({ pnrs, children }: { pnrs: string[]; children: ReactNode }) {
  const [cached, setCached] = useState<Record<string, PnrCacheRow>>({});

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
    <PnrBadgeContext.Provider value={{ overrides, cached, updatePnr }}>
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
