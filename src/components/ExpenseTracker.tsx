import { useCallback, useEffect, useMemo, useState } from 'react';
import { CAT_COLORS, EXPENSE_CATEGORIES, type Expense, type ExpenseCategory } from '../data/trip';
import { expenseWrite, listExpenses } from '../lib/api';
import { getPin, isUnlocked, lock, unlockExpiry } from '../lib/pin';
import { PinModal } from './PinModal';
import { CheckIcon, TrashIcon, LockIcon, UnlockIcon, PaperclipIcon } from './icons';
import { Attachments } from './Attachments';
import { Ornament } from './Ornament';

function fmt(n: number): string {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  Travel: 'Travel',
  Stay: 'Stay',
  Temple: 'Temple / Seva',
  Food: 'Food',
  Local: 'Local Transport',
  Misc: 'Miscellaneous',
};

export function ExpenseTracker() {
  const [items, setItems] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [unlocked, setUnlocked] = useState<boolean>(isUnlocked());
  const [pinOpen, setPinOpen] = useState(false);
  const [writeErr, setWriteErr] = useState<string | null>(null);
  const [, setTick] = useState(0);

  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAmt, setNewAmt] = useState('');
  const [newCat, setNewCat] = useState<ExpenseCategory>('Travel');
  const [adding, setAdding] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);
    try {
      const rows = await listExpenses();
      setItems(rows);
    } catch (e: any) {
      setLoadErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const id = setInterval(() => {
      const u = isUnlocked();
      setUnlocked((prev) => (prev !== u ? u : prev));
      setTick((t) => t + 1);
    }, 15000);
    return () => clearInterval(id);
  }, []);

  const totals = useMemo(() => {
    let total = 0;
    let paid = 0;
    for (const it of items) {
      total += it.amount;
      if (it.paid) paid += it.amount;
    }
    return { total, paid, outstanding: total - paid, perPerson: total / 2 };
  }, [items]);

  const grouped = useMemo(() => {
    const m = new Map<ExpenseCategory, Expense[]>();
    for (const c of EXPENSE_CATEGORIES) m.set(c, []);
    for (const it of items) {
      const arr = m.get(it.category) ?? [];
      arr.push(it);
      m.set(it.category, arr);
    }
    return EXPENSE_CATEGORIES
      .map((c) => {
        const rows = m.get(c) ?? [];
        const subtotal = rows.reduce((s, r) => s + r.amount, 0);
        const unpaid = rows.reduce((s, r) => s + (r.paid ? 0 : r.amount), 0);
        return { category: c, rows, subtotal, unpaid };
      })
      .filter((g) => g.rows.length > 0);
  }, [items]);

  function requirePin(): string | null {
    const pin = getPin();
    if (pin) {
      if (!unlocked) setUnlocked(true);
      return pin;
    }
    setUnlocked(false);
    setPinOpen(true);
    return null;
  }

  function describeErr(e: any): string {
    const msg = e?.message ?? String(e);
    if (/401|unauthor/i.test(msg)) return 'PIN expired — please unlock again.';
    return msg;
  }

  function handle401(e: any) {
    if (/401|unauthor/i.test(e?.message ?? '')) {
      lock();
      setUnlocked(false);
    }
  }

  async function togglePaid(it: Expense) {
    const pin = requirePin();
    if (!pin) return;
    const next = !it.paid;
    setItems((rows) => rows.map((r) => (r.id === it.id ? { ...r, paid: next } : r)));
    setWriteErr(null);
    try {
      await expenseWrite(pin, { action: 'update', payload: { id: it.id, paid: next } });
    } catch (e: any) {
      setWriteErr(describeErr(e));
      setItems((rows) => rows.map((r) => (r.id === it.id ? { ...r, paid: it.paid } : r)));
      handle401(e);
    }
  }

  async function commitAmount(it: Expense, raw: string) {
    const pin = requirePin();
    if (!pin) return;
    const amount = Number.parseFloat(raw) || 0;
    if (amount === it.amount) return;
    setItems((rows) => rows.map((r) => (r.id === it.id ? { ...r, amount } : r)));
    setWriteErr(null);
    try {
      await expenseWrite(pin, { action: 'update', payload: { id: it.id, amount } });
    } catch (e: any) {
      setWriteErr(describeErr(e));
      setItems((rows) => rows.map((r) => (r.id === it.id ? { ...r, amount: it.amount } : r)));
      handle401(e);
    }
  }

  async function remove(it: Expense) {
    const pin = requirePin();
    if (!pin) return;
    if (!confirm(`Remove "${it.name}"?`)) return;
    const prev = items;
    setItems((rows) => rows.filter((r) => r.id !== it.id));
    setWriteErr(null);
    try {
      await expenseWrite(pin, { action: 'delete', payload: { id: it.id } });
    } catch (e: any) {
      setWriteErr(describeErr(e));
      setItems(prev);
      handle401(e);
    }
  }

  async function add() {
    const name = newName.trim();
    if (!name) return;
    const pin = requirePin();
    if (!pin) return;
    setAdding(true);
    setWriteErr(null);
    try {
      const amount = Number.parseFloat(newAmt) || 0;
      await expenseWrite(pin, { action: 'create', payload: { name, category: newCat, amount } });
      setNewName('');
      setNewAmt('');
      setAddOpen(false);
      await refresh();
    } catch (e: any) {
      setWriteErr(describeErr(e));
      handle401(e);
    } finally {
      setAdding(false);
    }
  }

  function relock() {
    lock();
    setUnlocked(false);
  }

  const expiry = unlockExpiry();
  const expiresMin = expiry ? Math.max(0, Math.round((expiry - Date.now()) / 60000)) : 0;

  return (
    <>
      <div className="sec-head" id="expenses">
        <h2>
          <Ornament className="sec-orn" aria-hidden="true" />
          The Ledger
        </h2>
        <div className="note">A travel-keeper's account</div>
      </div>

      <section className="ledger">
        <header className="ldg-head">
          <div className="ldg-title">
            <Ornament className="ldg-orn" aria-hidden="true" />
            <h3>Expense Ledger</h3>
            <Ornament className="ldg-orn flip" aria-hidden="true" />
          </div>

          <div className="ldg-totals">
            <div className="ldg-tot">
              <span className="k">Total</span>
              <span className="v big">{fmt(totals.total)}</span>
            </div>
            <div className="ldg-tot">
              <span className="k">Paid</span>
              <span className="v paid">{fmt(totals.paid)}</span>
            </div>
            <div className="ldg-tot">
              <span className="k">Outstanding</span>
              <span className="v due">{fmt(totals.outstanding)}</span>
            </div>
            <div className="ldg-tot">
              <span className="k">Per person</span>
              <span className="v">{fmt(totals.perPerson)}</span>
            </div>
          </div>

          <div className="ldg-lock">
            {unlocked ? <UnlockIcon /> : <LockIcon />}
            <span className="ldg-lock-text">
              {unlocked ? `Unlocked · ${expiresMin}m left` : 'Locked — tap a row to unlock'}
            </span>
            <button className="ldg-lock-btn" onClick={unlocked ? relock : () => setPinOpen(true)}>
              {unlocked ? 'Lock' : 'Unlock'}
            </button>
          </div>
        </header>

        {writeErr && (
          <div className="twrite-err">
            {writeErr}
            <button onClick={() => setWriteErr(null)} aria-label="Dismiss">×</button>
          </div>
        )}

        <div className="ldg-body">
          {loading && <div className="ldg-empty">Loading the ledger…</div>}
          {loadErr && (
            <div className="ldg-empty">
              <div className="res-err">Couldn’t load expenses: {loadErr}</div>
            </div>
          )}

          {!loading &&
            !loadErr &&
            grouped.map((g) => (
              <div className="ldg-grp" key={g.category}>
                <div className="ldg-grp-head">
                  <span className="ldg-grp-tag" style={{ background: CAT_COLORS[g.category] }} aria-hidden="true" />
                  <span className="ldg-grp-name">{CATEGORY_LABEL[g.category]}</span>
                  <span className="ldg-grp-rule" aria-hidden="true" />
                  <span className="ldg-grp-sub">
                    {fmt(g.subtotal)}
                    {g.unpaid > 0 && g.unpaid !== g.subtotal && (
                      <span className="ldg-grp-due"> · {fmt(g.unpaid)} due</span>
                    )}
                  </span>
                </div>

                {g.rows.map((it) => (
                  <LedgerRow
                    key={it.id}
                    item={it}
                    unlocked={unlocked}
                    onToggle={() => togglePaid(it)}
                    onAmount={(v) => commitAmount(it, v)}
                    onDelete={() => remove(it)}
                    onLockedClick={() => setPinOpen(true)}
                  />
                ))}
              </div>
            ))}
        </div>

        <footer className="ldg-foot">
          {addOpen ? (
            <div className="ldg-add" role="group" aria-label="Add expense">
              <input
                className="ldg-add-name"
                placeholder="e.g. Pooja / Seva, Cab, Prasadam…"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') add();
                  if (e.key === 'Escape') setAddOpen(false);
                }}
                disabled={adding}
                autoFocus
              />
              <input
                className="ldg-add-amt"
                type="number"
                min={0}
                placeholder="₹ Amount"
                value={newAmt}
                onChange={(e) => setNewAmt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') add();
                  if (e.key === 'Escape') setAddOpen(false);
                }}
                disabled={adding}
              />
              <select
                className="ldg-add-cat"
                value={newCat}
                onChange={(e) => setNewCat(e.target.value as ExpenseCategory)}
                disabled={adding}
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </option>
                ))}
              </select>
              <button className="ldg-add-go" onClick={add} disabled={adding || !newName.trim()}>
                {adding ? 'Adding…' : 'Add to ledger'}
              </button>
              <button className="ldg-add-cancel" onClick={() => setAddOpen(false)} disabled={adding}>
                Cancel
              </button>
            </div>
          ) : (
            <button className="ldg-add-trigger" onClick={() => setAddOpen(true)}>
              <span aria-hidden="true">+</span> Add an expense
            </button>
          )}
        </footer>
      </section>

      {pinOpen && (
        <PinModal
          onClose={() => setPinOpen(false)}
          onUnlocked={() => {
            setUnlocked(true);
            setPinOpen(false);
          }}
        />
      )}
    </>
  );
}

interface RowProps {
  item: Expense;
  unlocked: boolean;
  onToggle: () => void;
  onAmount: (v: string) => void;
  onDelete: () => void;
  onLockedClick: () => void;
}

function LedgerRow({ item, unlocked, onToggle, onAmount, onDelete, onLockedClick }: RowProps) {
  const [local, setLocal] = useState<string>(String(item.amount || ''));
  const [showAtts, setShowAtts] = useState(false);

  useEffect(() => {
    setLocal(String(item.amount || ''));
  }, [item.amount]);

  function handleLockedRowClick(e: React.MouseEvent<HTMLDivElement>) {
    if (unlocked) return;
    const target = e.target as HTMLElement;
    if (target.closest('.lrow-att, .lrow-check')) return;
    e.preventDefault();
    onLockedClick();
  }

  return (
    <>
      <div
        className={`lrow${item.paid ? ' paid' : ''}${unlocked ? '' : ' locked'}`}
        onClick={handleLockedRowClick}
        role={unlocked ? undefined : 'button'}
        tabIndex={unlocked ? undefined : 0}
        onKeyDown={(e) => {
          if (unlocked) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onLockedClick();
          }
        }}
      >
        <button
          className="lrow-check"
          aria-label={item.paid ? 'Mark unpaid' : 'Mark paid'}
          onClick={onToggle}
          disabled={!unlocked}
        >
          {item.paid ? <CheckIcon /> : <span className="lrow-check-empty" aria-hidden="true" />}
        </button>

        <div className="lrow-desc">
          <div className="lrow-name">{item.name}</div>
          {item.hint && <div className="lrow-hint">{item.hint}</div>}
        </div>

        <div className="lrow-amt">
          <input
            type="number"
            min={0}
            step={1}
            value={local}
            disabled={!unlocked}
            onChange={(e) => setLocal(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            onBlur={() => onAmount(local)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') setLocal(String(item.amount || ''));
            }}
            placeholder="—"
          />
        </div>

        <button
          className={`lrow-att${showAtts ? ' on' : ''}`}
          onClick={() => setShowAtts((v) => !v)}
          aria-label={showAtts ? 'Hide attachments' : 'Show attachments'}
          title="Attachments"
        >
          <PaperclipIcon />
        </button>

        <button
          className="lrow-del"
          onClick={onDelete}
          disabled={!unlocked}
          aria-label="Remove"
          title="Remove"
        >
          <TrashIcon />
        </button>
      </div>
      {showAtts && (
        <div className="lrow-atts">
          <Attachments targetType="expense" targetId={item.id} label="Receipts & screenshots" />
        </div>
      )}
    </>
  );
}
