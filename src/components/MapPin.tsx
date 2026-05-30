import { openMap, mapUrl } from '../lib/maps';
import { PinIcon } from './icons';

interface Props {
  query: string;
}

export function MapPin({ query }: Props) {
  return (
    <a
      className="mapln"
      href={mapUrl(query)}
      target="_blank"
      rel="noopener noreferrer"
      title="Open in Google Maps"
      onClick={(e) => {
        e.preventDefault();
        openMap(query);
      }}
    >
      <PinIcon />
    </a>
  );
}
