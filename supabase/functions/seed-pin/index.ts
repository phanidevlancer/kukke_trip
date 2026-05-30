// One-shot seed for the expense PIN. Invoke once with no body, OR with `{ "force": true }`
// to overwrite. Reads the raw PIN from EXPENSE_PIN env var, hashes it, and stores
// the result in app_settings.expense_pin_hash. The raw PIN never leaves the function.
//
// Usage (from your machine, after `supabase secrets set EXPENSE_PIN=…`):
//   curl -X POST "$SUPABASE_URL/functions/v1/seed-pin" \
//     -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
//     -H "Content-Type: application/json" -d '{}'

import { preflight, json } from '../_shared/cors.ts';
import { hashPin, serviceClient, PIN_KEY_NAME } from '../_shared/pin.ts';

function jwtRole(authHeader: string): string | null {
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const parts = m[1].split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/').padEnd(parts[1].length + ((4 - (parts[1].length % 4)) % 4), '=')),
    );
    return typeof payload?.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, { status: 405 });

  // The Supabase gateway already validates the JWT signature (verify_jwt=true).
  // We just need to confirm the caller used the service_role key and not the
  // anon key — decode the payload and check the `role` claim.
  const auth = req.headers.get('authorization') ?? '';
  const role = jwtRole(auth);
  if (role !== 'service_role') {
    return json({ error: 'service_role_required', got_role: role }, { status: 401 });
  }

  let body: any = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    /* allow empty body */
  }
  const force = !!body?.force;

  const pin = Deno.env.get('EXPENSE_PIN') ?? '';
  if (!/^\d{4}$/.test(pin)) {
    return json({ error: 'EXPENSE_PIN must be a 4-digit string' }, { status: 400 });
  }

  const sb = serviceClient();
  const { data: existing } = await sb.from('app_settings').select('value').eq('key', PIN_KEY_NAME).maybeSingle();
  if (existing && !force) {
    return json({ ok: true, status: 'already_seeded' });
  }

  const value = await hashPin(pin);
  const { error } = await sb.from('app_settings').upsert({ key: PIN_KEY_NAME, value });
  if (error) return json({ error: error.message }, { status: 500 });

  return json({ ok: true, status: existing ? 'overwritten' : 'seeded' });
});
