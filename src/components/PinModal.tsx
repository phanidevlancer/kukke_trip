import { useEffect, useRef, useState } from 'react';
import { verifyPin } from '../lib/api';
import { unlock } from '../lib/pin';

interface Props {
  onClose: () => void;
  onUnlocked: () => void;
}

export function PinModal({ onClose, onUnlocked }: Props) {
  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const [err, setErr] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [shaking, setShaking] = useState(false);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function setAt(i: number, v: string) {
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    setErr('');
    if (v && i < 3) inputs.current[i + 1]?.focus();
    if (next.every((d) => d !== '')) submit(next.join(''));
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && i > 0) {
      inputs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowRight' && i < 3) {
      inputs.current[i + 1]?.focus();
    } else if (e.key === 'Enter') {
      submit(digits.join(''));
    }
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const v = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!v) return;
    e.preventDefault();
    const next = ['', '', '', ''];
    for (let i = 0; i < v.length; i++) next[i] = v[i];
    setDigits(next);
    setErr('');
    const focusIdx = Math.min(v.length, 3);
    inputs.current[focusIdx]?.focus();
    if (v.length === 4) submit(v);
  }

  async function submit(pin: string) {
    if (pin.length !== 4 || busy) return;
    setBusy(true);
    setErr('');
    try {
      await verifyPin(pin);
      unlock(pin);
      onUnlocked();
    } catch (e: any) {
      setShaking(true);
      setTimeout(() => setShaking(false), 450);
      setDigits(['', '', '', '']);
      inputs.current[0]?.focus();
      setErr(e?.message?.includes('401') || /unauth|invalid|wrong/i.test(String(e?.message)) ? 'Wrong PIN — try again' : `Verification failed: ${e?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pin-overlay" onClick={onClose}>
      <div
        className={`pin-modal${shaking ? ' shake' : ''}`}
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Enter expense PIN"
      >
        <h3>Enter PIN</h3>
        <p>4-digit PIN to edit expenses</p>
        <div className="pin-inputs">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { inputs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={1}
              value={d}
              disabled={busy}
              onChange={(e) => {
                const c = e.target.value.replace(/\D/g, '').slice(-1);
                setAt(i, c);
              }}
              onKeyDown={(e) => onKeyDown(i, e)}
              onPaste={onPaste}
              onFocus={(e) => e.currentTarget.select()}
            />
          ))}
        </div>
        <div className="pin-err">{err}</div>
        <div className="pin-actions">
          <button onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="primary" onClick={() => submit(digits.join(''))} disabled={busy || digits.some((d) => d === '')}>
            Unlock
          </button>
        </div>
      </div>
    </div>
  );
}
