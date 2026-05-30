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
