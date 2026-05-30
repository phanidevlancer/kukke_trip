import { preflight, json } from '../_shared/cors.ts';
import { serviceClient, verifyPin } from '../_shared/pin.ts';

const BUCKET = 'attachments';
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const SIGN_TTL = 60; // seconds

const VALID_TARGETS = new Set(['expense', 'train', 'hotel']);

function isAllowedType(t: string): boolean {
  if (!t) return false;
  if (t === 'application/pdf') return true;
  if (t.startsWith('image/')) return true;
  return false;
}

function safeFilename(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 120) || 'file';
}

function decodeBase64(b64: string): Uint8Array {
  const cleaned = b64.includes(',') ? b64.split(',', 2)[1] : b64;
  const bin = atob(cleaned);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
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

  const action = body?.action;
  const sb = serviceClient();

  // ------- LIST (read-only, no PIN required) -------
  if (action === 'list') {
    const target_type = String(body?.target_type ?? '');
    const target_id = String(body?.target_id ?? '');
    if (!VALID_TARGETS.has(target_type) || !target_id) {
      return json({ error: 'bad_target' }, { status: 400 });
    }
    const { data, error } = await sb
      .from('attachments')
      .select('id,filename,content_type,size_bytes,storage_path,created_at')
      .eq('target_type', target_type)
      .eq('target_id', target_id)
      .order('created_at', { ascending: false });
    if (error) return json({ error: error.message }, { status: 500 });

    const items = await Promise.all(
      (data ?? []).map(async (row) => {
        const { data: signed, error: signErr } = await sb.storage
          .from(BUCKET)
          .createSignedUrl(row.storage_path, SIGN_TTL);
        return {
          id: row.id,
          filename: row.filename,
          content_type: row.content_type,
          size_bytes: row.size_bytes,
          created_at: row.created_at,
          url: signErr ? null : signed?.signedUrl ?? null,
        };
      }),
    );
    return json({ ok: true, items });
  }

  // ------- writes from here on: PIN required -------
  const pin = String(body?.pin ?? '');
  const okPin = await verifyPin(pin);
  if (!okPin) return json({ error: 'unauthorized' }, { status: 401 });

  if (action === 'create') {
    const target_type = String(body?.target_type ?? '');
    const target_id = String(body?.target_id ?? '');
    const filename = safeFilename(String(body?.filename ?? ''));
    const content_type = String(body?.content_type ?? '');
    const base64 = String(body?.base64 ?? '');

    if (!VALID_TARGETS.has(target_type) || !target_id) {
      return json({ error: 'bad_target' }, { status: 400 });
    }
    if (!isAllowedType(content_type)) {
      return json({ error: 'unsupported_type', allowed: 'image/* or application/pdf' }, { status: 400 });
    }
    if (!base64) return json({ error: 'empty_file' }, { status: 400 });

    let bytes: Uint8Array;
    try {
      bytes = decodeBase64(base64);
    } catch {
      return json({ error: 'invalid_base64' }, { status: 400 });
    }
    if (bytes.byteLength === 0) return json({ error: 'empty_file' }, { status: 400 });
    if (bytes.byteLength > MAX_BYTES) {
      return json({ error: 'too_large', max_bytes: MAX_BYTES, got_bytes: bytes.byteLength }, { status: 400 });
    }

    const storage_path = `${target_type}/${target_id}/${crypto.randomUUID()}-${filename}`;
    const { error: upErr } = await sb.storage.from(BUCKET).upload(storage_path, bytes, {
      contentType: content_type,
      upsert: false,
    });
    if (upErr) return json({ error: upErr.message }, { status: 500 });

    const { data, error: insErr } = await sb
      .from('attachments')
      .insert({
        target_type,
        target_id,
        storage_path,
        filename,
        content_type,
        size_bytes: bytes.byteLength,
      })
      .select('id,filename,content_type,size_bytes,storage_path,created_at')
      .single();

    if (insErr) {
      // Best-effort cleanup if the row insert failed.
      await sb.storage.from(BUCKET).remove([storage_path]);
      return json({ error: insErr.message }, { status: 500 });
    }

    const { data: signed } = await sb.storage.from(BUCKET).createSignedUrl(storage_path, SIGN_TTL);
    return json({
      ok: true,
      item: {
        id: data.id,
        filename: data.filename,
        content_type: data.content_type,
        size_bytes: data.size_bytes,
        created_at: data.created_at,
        url: signed?.signedUrl ?? null,
      },
    });
  }

  if (action === 'delete') {
    const id = String(body?.id ?? '');
    if (!id) return json({ error: 'id_required' }, { status: 400 });
    const { data: row, error: selErr } = await sb
      .from('attachments')
      .select('storage_path')
      .eq('id', id)
      .maybeSingle();
    if (selErr) return json({ error: selErr.message }, { status: 500 });
    if (!row) return json({ error: 'not_found' }, { status: 404 });

    const { error: delObjErr } = await sb.storage.from(BUCKET).remove([row.storage_path]);
    if (delObjErr) return json({ error: delObjErr.message }, { status: 500 });

    const { error: delErr } = await sb.from('attachments').delete().eq('id', id);
    if (delErr) return json({ error: delErr.message }, { status: 500 });

    return json({ ok: true });
  }

  return json({ error: 'unknown_action' }, { status: 400 });
});
