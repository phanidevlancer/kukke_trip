import { useMemo, useState } from 'react';
import { fetchPnr, type PnrResponse } from '../lib/api';
import { ClockIcon, SpinnerIcon } from './icons';
import { relativeTime } from '../lib/maps';
import { roman } from './Ornament';
import {
  pickField,
  statusLabel,
  summarisePassengers,
  passengerView,
} from '../lib/pnrStatus';
import { usePnrCached, usePnrUpdate } from '../lib/pnrBadgeContext';

interface Props {
  pnr: string;
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

  const { verdict } = summarisePassengers(pax);

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
            <span className={`tt-chart-inline ${chartPrepared ? 'on' : 'off'}`}>
              <span className="tt-chart-dot" aria-hidden="true" />
              Chart · <b>{chartPrepared ? 'Prepared' : 'Not prepared yet'}</b>
            </span>
          )}
        </div>
      </div>

      {pax.length > 0 && (
        <>
          <div className="ticket-perf" aria-hidden="true" />
          <div className="ticket-pax">
            {pax.map((p, i) => {
              const v = passengerView(p);
              const name = PassengerName(p);
              const hasAllotment = !!(v.coach || v.berth);

              // Right column content (the "seat" cell) depends on status.
              let seatNode: React.ReactNode = null;
              if (hasAllotment) {
                seatNode = (
                  <>
                    {v.coach && (
                      <span className="tpax-seat-i">
                        Coach <b>{v.coach}</b>
                      </span>
                    )}
                    {v.berth && (
                      <span className="tpax-seat-i">
                        Berth <b>{v.berth}</b>
                        {v.berthSide ? ` · ${v.berthSide}` : ''}
                      </span>
                    )}
                  </>
                );
              } else if (v.kind === 'cnf' && chartPrepared === false) {
                seatNode = (
                  <span className="tpax-seat-pending">Seat · pending chart prep</span>
                );
              } else if (v.kind === 'cnf') {
                // Confirmed but chart prepped without allotment data — rare; just say allotted.
                seatNode = <span className="tpax-seat-pending">Seat · allotted</span>;
              }

              return (
                <div className={`tpax v-${v.kind}`} key={i}>
                  <div className="tpax-no">{roman(i + 1)}</div>
                  <div className="tpax-status">
                    {name && <div className="tpax-name">{name}</div>}
                    <div className="tpax-code">{v.current}</div>
                    {v.bookedFrom && (
                      <div className="tpax-was">was {v.bookedFrom}</div>
                    )}
                  </div>
                  <div className="tpax-seat">{seatNode}</div>
                  <div className={`tpax-stat v-${v.kind}`}>{statusLabel(v.kind)}</div>
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
  const cached = usePnrCached(pnr);
  const updatePnr = usePnrUpdate();

  const cachedResp = useMemo<PnrResponse | null>(() => {
    if (!cached) return null;
    return {
      status_json: cached.status_json,
      summary: null,
      source: null,
      fetched_at: cached.fetched_at,
      cached: true,
    };
  }, [cached]);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fetched, setFetched] = useState<PnrResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Prefer freshly fetched data when available, otherwise show the row we loaded
  // batch-style on page mount via the PnrBadgeProvider — no extra network on open.
  const resp = fetched ?? cachedResp;

  async function load(refresh: boolean) {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setErr(null);
    try {
      const r = await fetchPnr(pnr, { refresh });
      setFetched(r);
      // Push the fresh row up to the provider so the train-card badge
      // re-derives from the new status_json.
      updatePnr(pnr, {
        pnr,
        status_json: r.status_json,
        fetched_at: r.fetched_at,
      });
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
    // Only hit the network if the batch load didn't already give us this PNR.
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
