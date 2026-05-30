import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PIN_KEY = 'expense_pin_hash';

function bytesToHex(b: Uint8Array): string {
  return Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

async function pbkdf2(pin: string, salt: Uint8Array, iters: number): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: iters, hash: 'SHA-256' },
    key,
    256,
  );
  return new Uint8Array(bits);
}

export async function hashPin(pin: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iters = 120_000;
  const derived = await pbkdf2(pin, salt, iters);
  return `pbkdf2$sha256$${iters}$${bytesToHex(salt)}$${bytesToHex(derived)}`;
}

function ctEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a[i] ^ b[i];
  return r === 0;
}

export async function verifyAgainstHash(pin: string, encoded: string): Promise<boolean> {
  const parts = encoded.split('$');
  if (parts.length !== 5 || parts[0] !== 'pbkdf2' || parts[1] !== 'sha256') return false;
  const iters = Number(parts[2]);
  const salt = hexToBytes(parts[3]);
  const expected = hexToBytes(parts[4]);
  if (!Number.isFinite(iters) || iters <= 0) return false;
  const derived = await pbkdf2(pin, salt, iters);
  return ctEqual(derived, expected);
}

export function serviceClient() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function loadPinHash(): Promise<string | null> {
  const sb = serviceClient();
  const { data, error } = await sb.from('app_settings').select('value').eq('key', PIN_KEY).maybeSingle();
  if (error) throw error;
  return data?.value ?? null;
}

export async function verifyPin(pin: string): Promise<boolean> {
  if (!pin || pin.length < 4 || pin.length > 16) return false;
  const hash = await loadPinHash();
  if (!hash) return false;
  return await verifyAgainstHash(pin, hash);
}

export const PIN_KEY_NAME = PIN_KEY;
