export function mapUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function openMap(query: string): void {
  const w = window.open(mapUrl(query), '_blank');
  if (w) {
    try {
      w.opener = null;
    } catch {
      /* ignore */
    }
  } else {
    try {
      window.top!.location.href = mapUrl(query);
    } catch {
      window.location.href = mapUrl(query);
    }
  }
}

// Convert a "HH:MM" (24-hour) string into "h:MM AM/PM". Preserves a leading "~"
// approximation marker so "~20:00" becomes "~8:00 PM". Anything that doesn't
// match the HH:MM shape is returned unchanged (so labels like "Time TBD" pass
// through). 12:00 → "12:00 PM", 00:15 → "12:15 AM".
export function to12h(t: string): string {
  if (!t) return t;
  const m = /^(\s*~?\s*)(\d{1,2}):(\d{2})\s*$/.exec(t);
  if (!m) return t;
  const prefix = m[1];
  const hh = Number(m[2]);
  const mm = m[3];
  if (!Number.isFinite(hh) || hh < 0 || hh > 23) return t;
  const period = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${prefix}${h12}:${mm} ${period}`;
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const diff = Date.now() - then;
  const s = Math.floor(diff / 1000);
  if (s < 30) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
