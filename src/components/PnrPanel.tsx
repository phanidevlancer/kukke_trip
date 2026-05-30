import { useState } from 'react';
import { fetchPnr, type PnrResponse } from '../lib/api';
import { ClockIcon, SpinnerIcon } from './icons';
import { relativeTime } from '../lib/maps';
import { roman } from './Ornament';

interface Props {
  pnr: string;
}

function pickField(o: any, keys: string[]): any {
  if (!o) return null;
  for (const k of keys) {
    const v = o[k];
    if (v != null && v !== '') return v;
  }
  return null;
}

type StatusKind = 'cnf' | 'rac' | 'wl' | 'un';

function statusKind(s?: string): StatusKind {
  const u = String(s ?? '').toUpperCase();
  if (u.includes('CNF') || u.includes('CONFIRM')) return 'cnf';
  if (u.includes('RAC')) return 'rac';
  if (u.includes('WL') || u.includes('WAIT') || u.includes('RLWL') || u.includes('GNWL') || u.includes('PQWL')) return 'wl';
  return 'un';
}

function statusLabel(k: StatusKind): string {
  if (k === 'cnf') return 'Confirmed';
  if (k === 'wl') return 'Waitlist';
  if (k === 'rac') return 'RAC';
  return 'Status';
}

function checkUrl(p: string): string {
  return `https://www.confirmtkt.com/pnr-status/${p}`;
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function PassengerName(p: any): string {
  // The RapidAPI shape doesn't include names — we just have the seat status.
  // If the upstream ever does carry names, surface them; otherwise fall back to "Passenger N".
  return (
    pickField(p, ['passengerName', 'PassengerName', 'name', 'Name']) ?? ''
  );
}

function summary(pax: any[]): { kinds: StatusKind[]; verdict: StatusKind } {
  const kinds = pax.map((p) =>
    statusKind(pickField(p, ['currentStatus', 'CurrentStatus', 'currentStatusDetails']) ?? pickField(p, ['bookingStatus', 'BookingStatus'])),
  );
  if (kinds.length === 0) return { kinds, verdict: 'un' };
  if (kinds.every((k) => k === 'cnf')) return { kinds, verdict: 'cnf' };
  if (kinds.some((k) => k === 'wl')) return { kinds, verdict: 'wl' };
  if (kinds.some((k) => k === 'rac')) return { kinds, verdict: 'rac' };
  return { kinds, verdict: kinds[0] };
}

function TicketBody({ pnr, resp }: { pnr: string; resp: PnrResponse }) {
  const root = resp.status_json ?? {};
  const d = root.data ?? root.Data ?? root;

  const trainNo = pickField(d, ['trainNumber', 'trainNo', 'TrainNo']);
  const trainNm = pickField(d, ['trainName', 'TrainName']);
  const doj = pickField(d, ['dateOfJourney', 'doj', 'Doj', 'journeyDate']);
  const fromCode = pickField(d, ['boardingPoint', 'sourceStation', 'from', 'From']);
  const fromName = pickField(d, ['boardingStationName', 'sourceStationName']);
  const toCode = pickField(d, ['reservationUpto', 'destinationStation', 'to', 'To']);
  const toName = pickField(d, ['reservationUptoName', 'destinationStationName']);
  const cls = pickField(d, ['journeyClass', 'class', 'Class']);
  const chartRaw = pickField(d, ['chartStatus', 'chartPrepared', 'ChartStatus']);

  let pax: any[] = d.passengerList ?? d.PassengerStatus ?? d.passengers ?? d.PassengerList ?? [];
  if (!Array.isArray(pax)) pax = [];

  let chartPrepared: boolean | null = null;
  if (chartRaw != null) {
    const upper = String(chartRaw).toUpperCase();
    chartPrepared = !upper.includes('NOT') && !upper.includes('FALSE') && chartRaw !== false;
  }

  const { verdict } = summary(pax);

  const noBody = !trainNo && !trainNm && !doj && pax.length === 0;
  if (noBody) {
    return (
      <div className="res-err">
        Couldn’t read the status from the response. Try{' '}
        <a href={checkUrl(pnr)} target="_blank" rel="noopener noreferrer">
          the official site
        </a>{' '}
        or dial 139.
      </div>
    );
  }

  return (
    <div className={`ticket verdict-${verdict}`}>
      {/* perforated top edge (CSS pseudo-elements) */}
      <div className="ticket-strip" aria-hidden="true" />

      <div className="ticket-head">
        <div className="th-l">
          <div className="th-label">Reservation Status</div>
          <div className="th-pnr">
            PNR <b>{pnr}</b>
          </div>
        </div>
        <div className="th-r">
          <div className={`verdict-pill v-${verdict}`}>{statusLabel(verdict)}</div>
        </div>
      </div>

      <div className="ticket-train">
        {(trainNo || trainNm) && (
          <div className="tt-line">
            {trainNo && <span className="tt-no">{trainNo}</span>}
            {trainNm && <span className="tt-name">{trainNm}</span>}
          </div>
        )}
        {(fromCode || toCode) && (
          <div className="tt-route">
            <div className="tt-stn">
              <div className="tt-code">{fromCode ?? '—'}</div>
              {fromName && <div className="tt-stnname">{fromName}</div>}
            </div>
            <div className="tt-arrow" aria-hidden="true">
              <span className="tt-rule" />
              <span className="tt-tri">▶</span>
            </div>
            <div className="tt-stn right">
              <div className="tt-code">{toCode ?? '—'}</div>
              {toName && <div className="tt-stnname">{toName}</div>}
            </div>
          </div>
        )}
        <div className="tt-meta">
          {doj && <span className="tt-meta-i">Date · <b>{doj}</b></span>}
          {cls && <span className="tt-meta-i">Class · <b>{cls}</b></span>}
          {chartPrepared != null && (
            <span className={`tt-meta-i chart ${chartPrepared ? 'on' : 'off'}`}>
              Chart · <b>{chartPrepared ? 'Prepared' : 'Not yet'}</b>
            </span>
          )}
        </div>
      </div>

      {pax.length > 0 && (
        <>
          <div className="ticket-perf" aria-hidden="true" />
          <div className="ticket-pax">
            {pax.map((p, i) => {
              const bk = pickField(p, ['bookingStatus', 'BookingStatus', 'bookingStatusDetails']);
              const cur =
                pickField(p, ['currentStatus', 'CurrentStatus', 'currentStatusDetails']) ?? bk ?? '—';
              const name = PassengerName(p);
              const k = statusKind(cur);
              return (
                <div className={`tpax v-${k}`} key={i}>
                  <div className="tpax-no">{roman(i + 1)}</div>
                  <div className="tpax-main">
                    {name && <div className="tpax-name">{name}</div>}
                    <div className="tpax-line">
                      <span className="tpax-bk">Booked</span>
                      <span className="tpax-bkv">{bk ?? '—'}</span>
                      <span className="tpax-sep">·</span>
                      <span className="tpax-now">Now</span>
                      <span className="tpax-nowv">{cur}</span>
                    </div>
                  </div>
                  <div className={`tpax-stat v-${k}`}>{statusLabel(k)}</div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export function PnrPanel({ pnr }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [resp, setResp] = useState<PnrResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  async function load(refresh: boolean) {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setErr(null);
    try {
      const r = await fetchPnr(pnr, { refresh });
      setResp(r);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function onToggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (!resp) await load(false);
  }

  return (
    <div className={`leg-pnr${open ? ' open' : ''}`}>
      <div className="pnr-actions">
        <button className="pnr-live" onClick={onToggle} disabled={loading}>
          {loading ? <SpinnerIcon /> : <ClockIcon />}
          {loading ? 'Loading' : open ? 'Hide PNR status' : 'Check live PNR status'}
        </button>
        {open && resp && (
          <button
            className="pnr-refresh"
            onClick={() => load(true)}
            disabled={refreshing}
            title="Fetch fresh status from RapidAPI"
          >
            {refreshing ? <SpinnerIcon /> : <RefreshIcon />}
            {refreshing ? 'Refreshing' : 'Refresh'}
          </button>
        )}
      </div>

      <div className="pnr-result">
        {loading && !resp && (
          <div className="pnr-loading">
            <SpinnerIcon />
            <span>Fetching live status…</span>
          </div>
        )}
        {err && !resp && (
          <div className="res-err">
            Live lookup failed ({err}). The API may be rate-limited — open{' '}
            <a href={checkUrl(pnr)} target="_blank" rel="noopener noreferrer">
              the official checker
            </a>{' '}
            or dial 139.
          </div>
        )}
        {resp && (
          <>
            <TicketBody pnr={pnr} resp={resp} />

            <div className="ticket-foot">
              <button className="ticket-details" onClick={() => setShowDetails((v) => !v)}>
                <ChevronIcon open={showDetails} />
                {showDetails ? 'Hide details' : 'Details'}
              </button>
              <span className="ticket-foot-spacer" />
              <span className="ticket-when">
                {resp.fetched_at && relativeTime(resp.fetched_at)}
              </span>
            </div>

            {showDetails && (
              <div className="ticket-meta">
                <div className="tm-item">
                  <span className="tm-k">Freshness</span>
                  <span className="tm-v">
                    {resp.stale ? (
                      <span className="tm-tag stale">Stale · refresh failed</span>
                    ) : resp.cached ? (
                      <span className="tm-tag cached">Cached</span>
                    ) : (
                      <span className="tm-tag fresh">Fresh</span>
                    )}
                  </span>
                </div>
                {resp.source && (
                  <div className="tm-item">
                    <span className="tm-k">Source</span>
                    <span className="tm-v">{resp.source}</span>
                  </div>
                )}
                {resp.fetched_at && (
                  <div className="tm-item">
                    <span className="tm-k">Last checked</span>
                    <span className="tm-v">
                      {new Date(resp.fetched_at).toLocaleString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: 'short',
                      })}
                    </span>
                  </div>
                )}
                {err && resp && (
                  <div className="tm-item">
                    <span className="tm-k">Last error</span>
                    <span className="tm-v err">{err}</span>
                  </div>
                )}
                <div className="tm-item">
                  <span className="tm-k">Official</span>
                  <span className="tm-v">
                    <a href={checkUrl(pnr)} target="_blank" rel="noopener noreferrer">
                      confirmtkt.com / Dial 139
                    </a>
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
