import { preflight, json } from '../_shared/cors.ts';
import { serviceClient } from '../_shared/pin.ts';

const API_HOST = 'irctc-indian-railway-pnr-status.p.rapidapi.com';

interface ApiKey {
  nick: string;
  key: string;
}

// Discover RAPIDAPI_KEY_1, RAPIDAPI_KEY_2, ... with optional matching
// RAPIDAPI_NICK_1, RAPIDAPI_NICK_2 nicknames. Returned in numeric order.
function loadKeys(): ApiKey[] {
  const out: ApiKey[] = [];
  for (let i = 1; i < 32; i++) {
    const key = Deno.env.get(`RAPIDAPI_KEY_${i}`);
    if (!key) continue;
    const nick = Deno.env.get(`RAPIDAPI_NICK_${i}`) || `key${i}`;
    out.push({ nick, key });
  }
  // Back-compat: also accept a single RAPIDAPI_KEY if no numbered keys exist.
  if (out.length === 0) {
    const k = Deno.env.get('RAPIDAPI_KEY');
    if (k) out.push({ nick: 'primary', key: k });
  }
  return out;
}

function summarize(statusJson: unknown): string | null {
  const root =
    (statusJson as any)?.data ??
    (statusJson as any)?.Data ??
    (statusJson as any) ??
    {};
  const pax =
    root.passengerList ?? root.PassengerStatus ?? root.passengers ?? root.PassengerList ?? [];
  if (!Array.isArray(pax) || pax.length === 0) return null;
  const parts: string[] = [];
  for (const p of pax) {
    const cur =
      p?.currentStatus ??
      p?.CurrentStatus ??
      p?.currentStatusDetails ??
      p?.bookingStatus ??
      p?.BookingStatus;
    if (cur) parts.push(String(cur));
  }
  return parts.length ? parts.join(' / ') : null;
}

interface FetchAttempt {
  nick: string;
  ok: boolean;
  status?: number;
  error?: string;
}

async function fetchFromRapidAPI(
  pnr: string,
  keys: ApiKey[],
): Promise<
  | { ok: true; data: unknown; nick: string; attempts: FetchAttempt[] }
  | { ok: false; attempts: FetchAttempt[] }
> {
  const attempts: FetchAttempt[] = [];
  for (const k of keys) {
    try {
      const r = await fetch(`https://${API_HOST}/getPNRStatus/${pnr}`, {
        headers: { 'x-rapidapi-host': API_HOST, 'x-rapidapi-key': k.key },
      });
      if (!r.ok) {
        attempts.push({ nick: k.nick, ok: false, status: r.status });
        // Only fall through on quota/auth failures; bail for other errors.
        if (r.status === 429 || r.status === 401 || r.status === 403) continue;
        return { ok: false, attempts };
      }
      const data = await r.json();
      attempts.push({ nick: k.nick, ok: true, status: r.status });
      return { ok: true, data, nick: k.nick, attempts };
    } catch (e) {
      attempts.push({ nick: k.nick, ok: false, error: String((e as Error).message ?? e) });
    }
  }
  return { ok: false, attempts };
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, { status: 405 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, { status: 400 });
  }

  const pnr = String(body?.pnr ?? '').trim();
  if (!/^\d{10}$/.test(pnr)) return json({ error: 'invalid_pnr' }, { status: 400 });
  const refresh = !!body?.refresh;

  const sb = serviceClient();
  const { data: cached } = await sb.from('pnr_cache').select('*').eq('pnr', pnr).maybeSingle();

  // Cache-first: if we have a cached row and the caller didn't ask for a refresh,
  // return it immediately. Never expires implicitly — the UI controls refresh.
  if (cached && !refresh) {
    return json({
      status_json: cached.status_json,
      summary: cached.summary,
      source: cached.source ?? null,
      fetched_at: cached.fetched_at,
      cached: true,
    });
  }

  const keys = loadKeys();
  if (keys.length === 0) {
    if (cached) {
      return json({
        status_json: cached.status_json,
        summary: cached.summary,
        source: cached.source ?? null,
        fetched_at: cached.fetched_at,
        cached: true,
        stale: true,
        error: 'no_rapidapi_keys_configured',
      });
    }
    return json({ error: 'no_rapidapi_keys_configured' }, { status: 500 });
  }

  const result = await fetchFromRapidAPI(pnr, keys);
  if (result.ok) {
    const summary = summarize(result.data);
    const fetched_at = new Date().toISOString();
    await sb.from('pnr_cache').upsert({
      pnr,
      status_json: result.data,
      summary,
      source: result.nick,
      fetched_at,
    });
    return json({
      status_json: result.data,
      summary,
      source: result.nick,
      fetched_at,
      cached: false,
      attempts: result.attempts,
    });
  }

  // All keys failed. Fall back to stale cache if any.
  if (cached) {
    return json({
      status_json: cached.status_json,
      summary: cached.summary,
      source: cached.source ?? null,
      fetched_at: cached.fetched_at,
      cached: true,
      stale: true,
      error: 'all_keys_failed',
      attempts: result.attempts,
    });
  }
  return json(
    { error: 'all_keys_failed', attempts: result.attempts },
    { status: 502 },
  );
});
