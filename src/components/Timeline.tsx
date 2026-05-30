import { useEffect, useRef } from 'react';
import { DAYS } from '../data/trip';
import { TrainCard } from './TrainCard';
import { HotelCard } from './HotelCard';
import { PlanCard } from './PlanCard';
import { HomeIcon, AlertIcon } from './icons';
import { Ornament, roman } from './Ornament';

function useDesktopOpenAlerts(ref: React.RefObject<HTMLDivElement>) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const mq = window.matchMedia('(min-width: 561px)');
    function apply() {
      const desktop = mq.matches;
      root!.querySelectorAll<HTMLDetailsElement>('details.alert').forEach((d) => {
        if (desktop) d.open = true;
      });
    }
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [ref]);
}

function Html({ html }: { html: string }) {
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export function Timeline() {
  const rootRef = useRef<HTMLDivElement>(null);
  useDesktopOpenAlerts(rootRef);

  return (
    <div ref={rootRef}>
      <div className="sec-head">
        <h2>
          <Ornament className="sec-orn" aria-hidden="true" />
          The Journey
        </h2>
        <div className="note">Times subject to change — verify via IRCTC / Dial 139</div>
      </div>

      {DAYS.map((d) => (
        <div className="day" key={d.dayNum}>
          <div className="day-label">
            <div className="d" style={d.goldDayBadge ? { background: 'var(--gold)' } : undefined}>
              <span>{d.weekday}</span>
              <b className="day-num-roman">{roman(parseInt(d.dayNum, 10))}</b>
            </div>
            <div className="dl">
              {d.title}
              <small>{d.subtitle}</small>
            </div>
          </div>

          {d.items.map((it, i) => {
            switch (it.kind) {
              case 'home-note':
                return (
                  <div className="home-note" key={i}>
                    <HomeIcon />
                    <div>
                      <Html html={it.text} />
                    </div>
                  </div>
                );
              case 'train':
                return <TrainCard leg={it} key={i} />;
              case 'hotel':
                return <HotelCard leg={it} key={i} />;
              case 'plan':
                return <PlanCard plan={it} key={i} />;
              case 'alert':
                return (
                  <details className="alert" key={i}>
                    <summary>
                      <AlertIcon />
                      <span className="alert-t">{it.title}</span>
                      <span className="alert-chev" aria-hidden="true">⌄</span>
                    </summary>
                    <div className="alert-body">
                      <p>
                        <Html html={it.description} />
                      </p>
                    </div>
                  </details>
                );
              default:
                return null;
            }
          })}
        </div>
      ))}
    </div>
  );
}
