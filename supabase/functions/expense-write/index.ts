import { preflight, json } from '../_shared/cors.ts';
import { serviceClient, verifyPin } from '../_shared/pin.ts';

const CATEGORIES = new Set(['Travel', 'Stay', 'Temple', 'Food', 'Local', 'Misc']);

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

  const pin = String(body?.pin ?? '');
  const ok = await verifyPin(pin);
  if (!ok) return json({ error: 'unauthorized' }, { status: 401 });

  const action = body?.action;
  const payload = body?.payload ?? {};
  const sb = serviceClient();

  switch (action) {
    case 'verify':
      return json({ ok: true });

    case 'create': {
      const name = String(payload?.name ?? '').trim();
      const category = String(payload?.category ?? '');
      const amount = Number(payload?.amount ?? 0);
      if (!name) return json({ error: 'name_required' }, { status: 400 });
      if (!CATEGORIES.has(category)) return json({ error: 'bad_category' }, { status: 400 });
      if (!Number.isFinite(amount) || amount < 0) return json({ error: 'bad_amount' }, { status: 400 });
      const { data: maxRow } = await sb.from('expenses').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle();
      const sort_order = (maxRow?.sort_order ?? 0) + 10;
      const { data, error } = await sb
        .from('expenses')
        .insert({ name, category, amount, paid: false, sort_order })
        .select('id,name,category,amount,paid,hint,sort_order')
        .single();
      if (error) return json({ error: error.message }, { status: 500 });
      return json({ ok: true, expense: data });
    }

    case 'update': {
      const id = String(payload?.id ?? '');
      if (!id) return json({ error: 'id_required' }, { status: 400 });
      const patch: Record<string, unknown> = {};
      if ('amount' in payload) {
        const a = Number(payload.amount);
        if (!Number.isFinite(a) || a < 0) return json({ error: 'bad_amount' }, { status: 400 });
        patch.amount = a;
      }
      if ('paid' in payload) {
        patch.paid = !!payload.paid;
      }
      if (Object.keys(patch).length === 0) return json({ error: 'no_changes' }, { status: 400 });
      const { data, error } = await sb
        .from('expenses')
        .update(patch)
        .eq('id', id)
        .select('id,name,category,amount,paid,hint,sort_order')
        .single();
      if (error) return json({ error: error.message }, { status: 500 });
      return json({ ok: true, expense: data });
    }

    case 'delete': {
      const id = String(payload?.id ?? '');
      if (!id) return json({ error: 'id_required' }, { status: 400 });
      const { error } = await sb.from('expenses').delete().eq('id', id);
      if (error) return json({ error: error.message }, { status: 500 });
      return json({ ok: true });
    }

    default:
      return json({ error: 'unknown_action' }, { status: 400 });
  }
});
