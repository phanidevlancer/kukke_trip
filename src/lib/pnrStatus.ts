import type { BadgeKind } from '../data/trip';

export type StatusKind = 'cnf' | 'rac' | 'wl' | 'un';

export function pickField(o: any, keys: string[]): any {
  if (!o) return null;
  for (const k of keys) {
    const v = o[k];
    if (v != null && v !== '') return v;
  }
  return null;
}

export function statusKind(s?: string): StatusKind {
  const u = String(s ?? '').toUpperCase();
  if (u.includes('CNF') || u.includes('CONFIRM')) return 'cnf';
  if (u.includes('RAC')) return 'rac';
  if (
    u.includes('WL') ||
    u.includes('WAIT') ||
    u.includes('RLWL') ||
    u.includes('GNWL') ||
    u.includes('PQWL')
  )
    return 'wl';
  return 'un';
}

export function statusLabel(k: StatusKind): string {
  if (k === 'cnf') return 'Confirmed';
  if (k === 'wl') return 'Waitlist';
  if (k === 'rac') return 'RAC';
  return 'Status';
}

export interface Verdict {
  kinds: StatusKind[];
  verdict: StatusKind;
}

export function passengerListFromStatusJson(statusJson: any): any[] {
  const root = statusJson ?? {};
  const d = root.data ?? root.Data ?? root;
  const pax = d.passengerList ?? d.PassengerStatus ?? d.passengers ?? d.PassengerList ?? [];
  return Array.isArray(pax) ? pax : [];
}

export function summarisePassengers(pax: any[]): Verdict {
  const kinds = pax.map((p) =>
    statusKind(
      pickField(p, ['currentStatus', 'CurrentStatus', 'currentStatusDetails']) ??
        pickField(p, ['bookingStatus', 'BookingStatus']),
    ),
  );
  if (kinds.length === 0) return { kinds, verdict: 'un' };
  if (kinds.every((k) => k === 'cnf')) return { kinds, verdict: 'cnf' };
  if (kinds.some((k) => k === 'wl')) return { kinds, verdict: 'wl' };
  if (kinds.some((k) => k === 'rac')) return { kinds, verdict: 'rac' };
  return { kinds, verdict: kinds[0] };
}

export interface BadgeOverride {
  kind: BadgeKind;
  text: string;
}

export interface PassengerView {
  kind: StatusKind;
  /** The compact "Now" code to render prominently, e.g. "CNF", "RAC 7", "RLWL/9". */
  current: string;
  /** Coach allotment if upstream has one (only meaningful for CNF/RAC after chart prep). */
  coach?: string;
  /** Berth number if allotted. */
  berth?: string;
  /** Berth side / type, e.g. "Lower", "Side Lower", if upstream provides it. */
  berthSide?: string;
  /** When booking differs from current (e.g. WL/10 -> CNF), show the original. */
  bookedFrom?: string;
}

function nonEmpty(v: any): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  if (!s || s === '0') return undefined;
  return s;
}

const BERTH_SIDE: Record<string, string> = {
  LB: 'Lower',
  UB: 'Upper',
  MB: 'Middle',
  SL: 'Side Lower',
  SU: 'Side Upper',
};

export function passengerView(p: any): PassengerView {
  const curRaw =
    pickField(p, ['currentStatusDetails', 'currentStatus', 'CurrentStatus']) ?? '';
  const bookedRaw =
    pickField(p, ['bookingStatusDetails', 'bookingStatus', 'BookingStatus']) ?? '';
  const kind = statusKind(curRaw || bookedRaw);

  // Coach/berth fields are only meaningful for CNF or RAC. For WL/RLWL etc.
  // upstream often reuses `currentBerthNo` to mean the *queue position*, which
  // duplicates info already in `currentStatusDetails` (e.g. "RLWL/8") — don't
  // show it as a "Berth".
  const allotmentRelevant = kind === 'cnf' || kind === 'rac';
  const coach = allotmentRelevant
    ? nonEmpty(pickField(p, ['currentCoachId', 'CurrentCoachId', 'coachId']))
    : undefined;
  const berth = allotmentRelevant
    ? nonEmpty(pickField(p, ['currentBerthNo', 'CurrentBerthNo', 'berthNo']))
    : undefined;
  const sideRaw = allotmentRelevant
    ? nonEmpty(pickField(p, ['currentBerthCode', 'CurrentBerthCode', 'berthCode'])) ?? ''
    : '';
  const berthSide = BERTH_SIDE[sideRaw.toUpperCase()] ?? (sideRaw || undefined);

  let current = String(curRaw).trim();
  if (!current) current = String(bookedRaw).trim();

  // Compact RAC: "RAC/7" -> "RAC 7", bare "RAC" stays "RAC".
  if (kind === 'rac' && /^RAC\//i.test(current)) {
    current = current.replace(/^RAC\//i, 'RAC ');
  }

  const bookedClean = String(bookedRaw).trim();
  const bookedFrom = bookedClean && bookedClean !== current ? bookedClean : undefined;

  return {
    kind,
    current,
    coach,
    berth,
    berthSide,
    bookedFrom,
  };
}

export function chartPreparedFromStatusJson(statusJson: any): boolean | null {
  const root = statusJson ?? {};
  const d = root.data ?? root.Data ?? root;
  const raw = pickField(d, ['chartStatus', 'chartPrepared', 'ChartStatus']);
  if (raw == null) return null;
  if (raw === false) return false;
  const u = String(raw).toUpperCase();
  if (u.includes('NOT') || u.includes('FALSE')) return false;
  return true;
}

function waitlistFlavour(pax: any[]): string | null {
  for (const p of pax) {
    const raw = String(
      pickField(p, ['currentStatus', 'CurrentStatus', 'currentStatusDetails']) ??
        pickField(p, ['bookingStatus', 'BookingStatus']) ??
        '',
    ).toUpperCase();
    if (raw.includes('RLWL')) return 'RLWL';
    if (raw.includes('GNWL')) return 'GNWL';
    if (raw.includes('PQWL')) return 'PQWL';
  }
  return null;
}

export function badgeFromStatusJson(statusJson: any): BadgeOverride | null {
  const pax = passengerListFromStatusJson(statusJson);
  if (pax.length === 0) return null;
  const { kinds, verdict } = summarisePassengers(pax);

  if (verdict === 'cnf') return { kind: 'cnf', text: 'Confirmed' };
  if (verdict === 'rac') return { kind: 'wl', text: 'RAC' };
  if (verdict === 'wl') {
    const anyConfirmed = kinds.some((k) => k === 'cnf');
    if (anyConfirmed) return { kind: 'partial', text: 'Partly confirmed' };
    const flavour = waitlistFlavour(pax);
    return { kind: 'wl', text: flavour ? `Waitlist · ${flavour}` : 'Waitlist' };
  }
  return null;
}
