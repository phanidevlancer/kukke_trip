import type { HotelLeg } from '../data/trip';
import { MAP_PINS } from '../data/trip';
import { HotelIcon } from './icons';
import { MapPin } from './MapPin';
import { Attachments } from './Attachments';

interface Props {
  leg: HotelLeg;
}

export function HotelCard({ leg }: Props) {
  const pin = MAP_PINS[leg.name];
  const bookingChip = leg.chips.find((c) => c.label === 'Booking');
  const targetId = bookingChip?.value ?? leg.name;

  return (
    <div className="leg hotel">
      <div className="leg-top">
        <div className="leg-mode">
          <HotelIcon />
          Stay · Deluxe Room
        </div>
        <div className="badge cnf">Confirmed</div>
      </div>
      <div className="hotel-body">
        <div className="hb-main">
          <h3>
            {leg.name}
            {pin && <MapPin query={pin} />}
          </h3>
          <div className="addr">{leg.address}</div>
          <div className="leg-meta" style={{ border: 'none', paddingTop: 10 }}>
            {leg.chips.map((c, i) => (
              <span key={i} className="chip">
                {c.label}
                {c.value && (
                  <>
                    {' '}
                    <b>{c.value}</b>
                  </>
                )}
              </span>
            ))}
          </div>
        </div>
        <div className="nights">
          <b>{leg.nights}</b>
          <span>Night</span>
        </div>
      </div>
      <Attachments targetType="hotel" targetId={targetId} label="Booking & receipts" />
    </div>
  );
}
