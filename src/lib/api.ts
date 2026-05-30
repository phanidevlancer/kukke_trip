import { supabase } from './supabase';
import type { Expense, ExpenseCategory } from '../data/trip';

export interface PnrPassenger {
  no?: string | number;
  bookingStatus?: string;
  currentStatus?: string;
}

export interface PnrSummary {
  trainNumber?: string;
  trainName?: string;
  dateOfJourney?: string;
  boardingPoint?: string;
  reservationUpto?: string;
  journeyClass?: string;
  chartStatus?: string | boolean;
  passengerList?: PnrPassenger[];
  pnrNumber?: string;
}

export interface PnrResponse {
  status_json: any;
  summary: string | null;
  source: string | null;
  fetched_at: string;
  cached: boolean;
  stale?: boolean;
  error?: string;
  attempts?: Array<{ nick: string; ok: boolean; status?: number; error?: string }>;
}

async function callFunction<T>(name: string, body: any): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw error;
  return data as T;
}

export async function fetchPnr(pnr: string, opts: { refresh?: boolean } = {}): Promise<PnrResponse> {
  return callFunction<PnrResponse>('pnr-status', { pnr, refresh: !!opts.refresh });
}

export interface PnrCacheRow {
  pnr: string;
  status_json: any;
  fetched_at: string;
}

export async function fetchPnrCacheBatch(pnrs: string[]): Promise<Record<string, PnrCacheRow>> {
  if (pnrs.length === 0) return {};
  const { data, error } = await supabase
    .from('pnr_cache')
    .select('pnr,status_json,fetched_at')
    .in('pnr', pnrs);
  if (error) throw error;
  const out: Record<string, PnrCacheRow> = {};
  for (const r of data ?? []) {
    out[r.pnr] = {
      pnr: r.pnr,
      status_json: r.status_json,
      fetched_at: r.fetched_at,
    };
  }
  return out;
}

export async function listExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('id,name,category,amount,paid,hint,sort_order')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    category: r.category as ExpenseCategory,
    amount: Number(r.amount),
    paid: !!r.paid,
    hint: r.hint,
    sort_order: r.sort_order,
  }));
}

export type WriteAction =
  | { action: 'create'; payload: { name: string; category: ExpenseCategory; amount: number } }
  | { action: 'update'; payload: { id: string; amount?: number; paid?: boolean } }
  | { action: 'delete'; payload: { id: string } }
  | { action: 'verify'; payload?: undefined };

export async function expenseWrite(pin: string, op: WriteAction): Promise<{ ok: true; expense?: Expense }> {
  return callFunction('expense-write', { pin, ...op });
}

export async function verifyPin(pin: string): Promise<{ ok: true }> {
  return expenseWrite(pin, { action: 'verify' });
}

// ---------- Attachments ----------

export type AttachmentTarget = 'expense' | 'train' | 'hotel';

export interface Attachment {
  id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
  url: string | null;
}

export async function listAttachments(target_type: AttachmentTarget, target_id: string): Promise<Attachment[]> {
  const data = await callFunction<{ items: Attachment[] }>('attachments', {
    action: 'list',
    target_type,
    target_id,
  });
  return data.items ?? [];
}

export async function uploadAttachment(
  pin: string,
  target_type: AttachmentTarget,
  target_id: string,
  file: File,
): Promise<Attachment> {
  const base64 = await fileToBase64(file);
  const data = await callFunction<{ item: Attachment }>('attachments', {
    action: 'create',
    pin,
    target_type,
    target_id,
    filename: file.name,
    content_type: file.type || 'application/octet-stream',
    base64,
  });
  return data.item;
}

export async function deleteAttachment(pin: string, id: string): Promise<void> {
  await callFunction('attachments', { action: 'delete', pin, id });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') return reject(new Error('reader_failed'));
      // strip the "data:<type>;base64," prefix
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('reader_failed'));
    reader.readAsDataURL(file);
  });
}
