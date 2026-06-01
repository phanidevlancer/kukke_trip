import type { TrainLeg } from '../data/trip';
import { MAP_PINS } from '../data/trip';
import { TrainIcon } from './icons';
import { MapPin } from './MapPin';
import { PnrPanel } from './PnrPanel';
import { Attachments } from './Attachments';
import { usePnrBadge } from '../lib/pnrBadgeContext';
import { to12h } from '../lib/maps';

interface Props {
  leg: TrainLeg;
}

export function TrainCard({ leg }: Props) {
  const fromPin = MAP_PINS[leg.from.name];
  const toPin = MAP_PINS[leg.to.name];
  const override = usePnrBadge(leg.pnr);
  const badge = override ?? leg.badge;

  return (
    <div className="leg train">
      <div className="leg-top">
        <div className="leg-mode">
          <TrainIcon />
          {leg.mode}
        </div>
        <div className={`badge ${badge.kind}`}>{badge.text}</div>
      </div>

      <div className="od">
        <div className="stn">
          <div className="time">{to12h(leg.from.time)}</div>
          <div className="name">
            {leg.from.name}
            {fromPin && <MapPin query={fromPin} />}
          </div>
          <div className="code">{leg.from.code}</div>
        </div>
        <div className="mid">
          <div className="dur">{leg.duration}</div>
          <div className="track">
            <span className="dotc" />
            <span className="ln" />
            <span className="dotc" />
          </div>
        </div>
        <div className="stn right">
          <div className="time">
            {to12h(leg.to.time)}
            {leg.to.timePlus && (
              <sup style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{leg.to.timePlus}</sup>
            )}
          </div>
          <div className="name">
            {leg.to.name}
            {toPin && <MapPin query={toPin} />}
          </div>
          <div className="code">{leg.to.code}</div>
        </div>
      </div>

      <div className="leg-meta">
        <span className="chip">
          <b>{leg.trainNo}</b> {leg.trainName}
        </span>
        <span className="chip">
          PNR <b>{leg.pnr}</b>
        </span>
        <span className="chip">{leg.distance}</span>
        <span className="chip">{leg.extraChip}</span>
        <span className="chip" style={{ marginLeft: 'auto' }}>
          Fare <span className="fare">{leg.fare}</span>
        </span>
      </div>

      <PnrPanel pnr={leg.pnr} />
      <Attachments targetType="train" targetId={leg.pnr} label="Tickets & receipts" />
    </div>
  );
}
