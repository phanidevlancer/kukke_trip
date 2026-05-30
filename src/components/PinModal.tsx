import { useEffect, useRef, useState } from 'react';
import { verifyPin } from '../lib/api';
import { unlock } from '../lib/pin';

type Mode = 'unlock' | 'confirm';

interface Props {
  onClose: () => void;
  /** Called once the user enters a valid PIN. Receives the verified PIN
   *  string so callers in 'confirm' mode (which deliberately doesn't write
   *  to sessionStorage) can pass it to their write call. */
  onUnlocked: (pin: string) => void;
  /** 'unlock' (default) starts/extends a session. 'confirm' re-verifies the
   *  PIN for a sensitive action without affecting unlock state. */
  mode?: Mode;
  /** Override the modal heading (e.g. "Confirm delete"). */
  title?: string;
  /** Subtitle, e.g. "Remove this expense permanently". */
  subtitle?: string;
  /** CTA label. Defaults: "Unlock" for 'unlock', "Confirm" for 'confirm'. */
  ctaLabel?: string;
  /** When provided in 'confirm' mode, shown in the modal as the item being acted on. */
  itemLabel?: string;
}

export function PinModal({
  onClose,
  onUnlocked,
  mode = 'unlock',
  title,
  subtitle,
  ctaLabel,
  itemLabel,
}: Props) {
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
      // 'confirm' mode re-verifies without starting a fresh session; we leave
      // the existing unlock expiry alone so the user isn't surprised by a
      // refreshed timer just because they deleted something.
      if (mode !== 'confirm') unlock(pin);
      onUnlocked(pin);
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

  const headingText = title ?? (mode === 'confirm' ? 'Confirm with PIN' : 'Enter PIN');
  const subtitleText =
    subtitle ?? (mode === 'confirm' ? 'Re-enter your 4-digit PIN to confirm' : '4-digit PIN to edit expenses');
  const ctaText = ctaLabel ?? (mode === 'confirm' ? 'Confirm' : 'Unlock');

  return (
    <div className="pin-overlay" onClick={onClose}>
      <div
        className={`pin-modal${shaking ? ' shake' : ''}${mode === 'confirm' ? ' confirm' : ''}`}
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={headingText}
      >
        <h3>{headingText}</h3>
        <p>{subtitleText}</p>
        {itemLabel && <div className="pin-item">{itemLabel}</div>}
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
          <button
            className={`primary${mode === 'confirm' ? ' danger' : ''}`}
            onClick={() => submit(digits.join(''))}
            disabled={busy || digits.some((d) => d === '')}
          >
            {ctaText}
          </button>
        </div>
      </div>
    </div>
  );
}
