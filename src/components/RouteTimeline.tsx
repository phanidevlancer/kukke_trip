import type { MiniStep } from '../data/trip';
import { MapPin } from './MapPin';
import {
  StopGopuramIcon,
  StopPlateIcon,
  StopTrainIcon,
  StopBedIcon,
  StopClockIcon,
} from './icons';
import { to12h } from '../lib/maps';

interface Props {
  steps: MiniStep[];
  /** 'darshan' or 'prasadam' — controls accent colour. */
  theme: 'darshan' | 'prasadam';
}

type StopKind = 'temple' | 'food' | 'train' | 'bed' | 'clock';

function detectKind(step: MiniStep): StopKind {
  const haystack = `${step.bold ?? ''} ${step.text ?? ''} ${step.mapPin ?? ''} ${step.small ?? ''}`.toLowerCase();
  if (/darshan|temple|seva|kukke|dharmasthala|manjunatha|subramanya|annadanam/.test(haystack)) return 'temple';
  if (/lunch|meal|food|biryani|meghana|nagarjuna|prasadam|dinner|breakfast/.test(haystack)) return 'food';
  if (/train|station|yesvantpur|kacheguda|ypr|sbc|sbhr|ksr|yelhanka|cab|drive|cross-?town/.test(haystack)) return 'train';
  if (/hotel|rest|pack|check.?in|check.?out|nap|freshen/.test(haystack)) return 'bed';
  return 'clock';
}

function IconFor({ kind }: { kind: StopKind }) {
  switch (kind) {
    case 'temple': return <StopGopuramIcon />;
    case 'food': return <StopPlateIcon />;
    case 'train': return <StopTrainIcon />;
    case 'bed': return <StopBedIcon />;
    default: return <StopClockIcon />;
  }
}

/**
 * RouteTimeline — renders steps along a hand-drawn dashed S-curve route.
 *
 * On desktop, the curve sits centred and stops alternate L/R sides.
 * On mobile, the curve becomes a left-side single rail (handled in CSS).
 *
 * The SVG curve is a background decoration; step positioning is done with
 * CSS grid + nth-child rather than coordinate math, so the layout stays
 * responsive without requiring resize-observers.
 */
export function RouteTimeline({ steps, theme }: Props) {
  return (
    <div className={`route route-${theme}`}>
      {/* Decorative dashed curve, drawn behind the steps. */}
      <svg
        className="route-curve"
        viewBox="0 0 200 1000"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {/* Two gentle S-curves between the top and bottom. */}
        <path
          d="M 100 10
             C 30 150, 170 270, 100 400
             C 30 530, 170 650, 100 780
             C 70 870, 130 940, 100 990"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeDasharray="4 6"
        />
      </svg>

      <ol className="route-steps">
        {steps.map((s, i) => {
          const kind = detectKind(s);
          return (
            <li key={i} className={`route-step kind-${kind}`}>
              <div className="route-pin" aria-hidden="true">
                <IconFor kind={kind} />
              </div>
              <div className="route-card">
                <div className="route-time">{to12h(s.time)}</div>
                <div className="route-body">
                  {s.bold && <b>{s.bold}</b>}
                  {s.mapPin && <MapPin query={s.mapPin} />}
                  {s.text && <span className="route-text">{s.text}</span>}
                  {s.traffic && (
                    <span className="traffic">
                      <StopClockIcon />
                      {s.traffic}
                    </span>
                  )}
                  {s.small && <small>{s.small}</small>}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
