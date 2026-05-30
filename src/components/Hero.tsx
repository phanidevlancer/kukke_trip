import { Ornament } from './Ornament';

export function Hero() {
  return (
    <header className="hero">
      <Ornament className="hero-orn top" aria-hidden="true" />
      <div className="kicker">Pilgrimage · June MMXXVI</div>
      <h1>
        <span className="om">ॐ शरवणभव</span>
        <span className="title-line one">
          <span className="dropcap" aria-hidden="true">K</span>
          <span className="rest">ukke Subramanya</span>
        </span>
        <span className="title-line two">Yatra</span>
      </h1>
      <div className="sub">Hyderabad to the abode of Sri Subramanya &amp; back</div>
      <Ornament className="hero-orn bottom" aria-hidden="true" />

      <div className="route-pill">
        <b>Hyderabad</b>
        <span className="arr">→</span>
        <b>Bengaluru</b>
        <span className="arr">→</span>
        <b>Kukke</b>
        <span className="arr">→</span>
        <b>Bengaluru</b>
        <span className="arr">→</span>
        <b>Hyderabad</b>
      </div>
      <div className="facts">
        <div className="fact">
          <b>Jun 1 &ndash; Jun 4, 2026</b> &middot; 4 days
        </div>
        <div className="fact">
          Travellers &middot; <b>Phanindra &amp; Mounika</b>
        </div>
        <div className="fact">
          <b>4 trains</b> &middot; 1 night stay
        </div>
      </div>
    </header>
  );
}
