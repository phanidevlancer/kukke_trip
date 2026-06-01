import { preflight, json } from '../_shared/cors.ts';
import { serviceClient } from '../_shared/pin.ts';

const API_HOST = 'irctc-indian-railway-pnr-status.p.rapidapi.com';
const MONTHLY_LIMIT_DEFAULT = 100;

interface ApiKey {
  nick: string;
  key: string;
}

interface UsageRow {
  nick: string;
  count: number;
  monthly_limit: number;
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

function currentMonth(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

async function loadUsage(
  sb: ReturnType<typeof serviceClient>,
  nicks: string[],
): Promise<UsageRow[]> {
  if (nicks.length === 0) return [];
  const month = currentMonth();
  const { data } = await sb
    .from('rapidapi_usage')
    .select('nick,count,monthly_limit')
    .eq('month', month)
    .in('nick', nicks);
  const found = new Map<string, UsageRow>();
  for (const r of data ?? []) {
    found.set(r.nick, {
      nick: r.nick,
      count: r.count ?? 0,
      monthly_limit: r.monthly_limit ?? MONTHLY_LIMIT_DEFAULT,
    });
  }
  return nicks.map(
    (n) =>
      found.get(n) ?? { nick: n, count: 0, monthly_limit: MONTHLY_LIMIT_DEFAULT },
  );
}

function parseIntHeader(h: string | null): number | null {
  if (h == null) return null;
  const n = Number(h);
  return Number.isFinite(n) ? n : null;
}

// RapidAPI returns the authoritative quota state on every response:
//   x-ratelimit-requests-limit:     total allowance for the window (e.g. 100)
//   x-ratelimit-requests-remaining: how many calls are left after THIS one
// Persist that so the UI shows the real upstream count, not our local guess.
async function recordUsageFromHeaders(
  sb: ReturnType<typeof serviceClient>,
  nick: string,
  headers: Headers,
): Promise<void> {
  const limit = parseIntHeader(headers.get('x-ratelimit-requests-limit'));
  const remaining = parseIntHeader(headers.get('x-ratelimit-requests-remaining'));
  if (limit == null || remaining == null) return;
  const count = Math.max(0, limit - remaining);
  const month = currentMonth();
  await sb
    .from('rapidapi_usage')
    .upsert(
      { nick, month, count, monthly_limit: limit },
      { onConflict: 'nick,month' },
    );
}

function isUpstreamSuccess(body: unknown): boolean {
  const root = (body as any) ?? {};
  // Upstream marks failures with success:false even on HTTP 200.
  if (root.success === false) return false;
  const d = root.data ?? root.Data ?? root;
  const pax =
    d?.passengerList ?? d?.PassengerStatus ?? d?.passengers ?? d?.PassengerList;
  // A real PNR response always has at least one passenger entry.
  return Array.isArray(pax) && pax.length > 0;
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
  sb: ReturnType<typeof serviceClient>,
  pnr: string,
  keys: ApiKey[],
  usage: UsageRow[],
): Promise<
  | { ok: true; data: unknown; nick: string; attempts: FetchAttempt[] }
  | { ok: false; attempts: FetchAttempt[] }
> {
  const attempts: FetchAttempt[] = [];
  const usageByNick = new Map(usage.map((u) => [u.nick, u]));
  for (const k of keys) {
    const u = usageByNick.get(k.nick);
    if (u && u.count >= u.monthly_limit) {
      attempts.push({ nick: k.nick, ok: false, error: 'monthly_limit_reached' });
      continue;
    }
    try {
      const r = await fetch(`https://${API_HOST}/getPNRStatus/${pnr}`, {
        headers: { 'x-rapidapi-host': API_HOST, 'x-rapidapi-key': k.key },
      });
      // RapidAPI puts the authoritative quota state on every response (success or
      // failure), so persist it regardless of status code.
      await recordUsageFromHeaders(sb, k.nick, r.headers);
      if (!r.ok) {
        attempts.push({ nick: k.nick, ok: false, status: r.status });
        if (r.status === 429 || r.status === 401 || r.status === 403) continue;
        return { ok: false, attempts };
      }
      const data = await r.json();
      if (!isUpstreamSuccess(data)) {
        attempts.push({ nick: k.nick, ok: false, status: r.status, error: 'upstream_no_data' });
        continue;
      }
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

  const sb = serviceClient();
  const keys = loadKeys();
  const nicks = keys.map((k) => k.nick);

  // Lightweight mode: just return current usage without touching RapidAPI or the
  // PNR cache. Used by the UI to render a "you have N calls left" confirmation
  // dialog before the user actually spends a call.
  if (body?.usage_only) {
    const usage = await loadUsage(sb, nicks);
    return json({ usage });
  }

  const pnr = String(body?.pnr ?? '').trim();
  if (!/^\d{10}$/.test(pnr)) return json({ error: 'invalid_pnr' }, { status: 400 });
  const refresh = !!body?.refresh;
  const { data: cached } = await sb.from('pnr_cache').select('*').eq('pnr', pnr).maybeSingle();

  // Cache-first: if we have a cached row and the caller didn't ask for a refresh,
  // return it immediately. Never expires implicitly — the UI controls refresh.
  if (cached && !refresh) {
    const usage = await loadUsage(sb, nicks);
    return json({
      status_json: cached.status_json,
      summary: cached.summary,
      source: cached.source ?? null,
      fetched_at: cached.fetched_at,
      cached: true,
      usage,
    });
  }

  if (keys.length === 0) {
    const usage = await loadUsage(sb, nicks);
    if (cached) {
      return json({
        status_json: cached.status_json,
        summary: cached.summary,
        source: cached.source ?? null,
        fetched_at: cached.fetched_at,
        cached: true,
        stale: true,
        error: 'no_rapidapi_keys_configured',
        usage,
      });
    }
    return json(
      { error: 'no_rapidapi_keys_configured', usage },
      { status: 500 },
    );
  }

  const usageBefore = await loadUsage(sb, nicks);
  const result = await fetchFromRapidAPI(sb, pnr, keys, usageBefore);
  const usage = await loadUsage(sb, nicks);

  if (result.ok) {
    const summary = summarize(result.data);
    const fetched_at = new Date().toISOString();
    await sb.from('pnr_cache').upsert(
      {
        pnr,
        status_json: result.data,
        summary,
        source: result.nick,
        fetched_at,
      },
      { onConflict: 'pnr' },
    );
    return json({
      status_json: result.data,
      summary,
      source: result.nick,
      fetched_at,
      cached: false,
      attempts: result.attempts,
      usage,
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
      usage,
    });
  }
  return json(
    { error: 'all_keys_failed', attempts: result.attempts, usage },
    { status: 502 },
  );
});
