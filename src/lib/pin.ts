const EXPIRY_KEY = 'kukke_pin_unlock_v1';
const PIN_KEY = 'kukke_pin_value_v1';
const TTL_MS = 15 * 60 * 1000;

export function isUnlocked(): boolean {
  try {
    const v = sessionStorage.getItem(EXPIRY_KEY);
    if (!v) return false;
    const ok = Number(v) > Date.now();
    if (!ok) lock();
    return ok;
  } catch {
    return false;
  }
}

export function unlock(pin: string): void {
  try {
    sessionStorage.setItem(EXPIRY_KEY, String(Date.now() + TTL_MS));
    sessionStorage.setItem(PIN_KEY, pin);
  } catch {
    /* no-op */
  }
}

export function lock(): void {
  try {
    sessionStorage.removeItem(EXPIRY_KEY);
    sessionStorage.removeItem(PIN_KEY);
  } catch {
    /* no-op */
  }
}

export function getPin(): string | null {
  try {
    if (!isUnlocked()) return null;
    return sessionStorage.getItem(PIN_KEY);
  } catch {
    return null;
  }
}

export function unlockExpiry(): number | null {
  try {
    const v = sessionStorage.getItem(EXPIRY_KEY);
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}
