import { useEffect, useState } from 'react';
import type { PlanCardData, PlanCardImage } from '../data/trip';
import { PrasadamIcon, DarshanIcon } from './icons';
import { PrasadamBanner, TempleBanner } from './PlanBanners';
import { RouteTimeline } from './RouteTimeline';

interface Props {
  plan: PlanCardData;
}

type View = 'image' | 'text';

const STORAGE_PREFIX = 'kukke_plan_view_v1:';

function readSavedView(id: string): View | null {
  try {
    const v = localStorage.getItem(STORAGE_PREFIX + id);
    return v === 'image' || v === 'text' ? v : null;
  } catch {
    return null;
  }
}

function saveView(id: string, v: View): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + id, v);
  } catch {
    /* no-op */
  }
}

function Html({ html }: { html: string }) {
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

function PlanRouteImage({ image }: { image: PlanCardImage }) {
  return (
    <figure className="plan-route-image">
      <picture>
        <source media="(max-width: 560px)" srcSet={image.mobile} />
        <img src={image.desktop} alt={image.alt} loading="lazy" />
      </picture>
    </figure>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: View;
  onChange: (v: View) => void;
}) {
  return (
    <div className="plan-view-toggle" role="tablist" aria-label="View mode">
      <button
        role="tab"
        aria-selected={view === 'image'}
        className={view === 'image' ? 'on' : ''}
        onClick={() => onChange('image')}
      >
        Map
      </button>
      <button
        role="tab"
        aria-selected={view === 'text'}
        className={view === 'text' ? 'on' : ''}
        onClick={() => onChange('text')}
      >
        Steps
      </button>
    </div>
  );
}

export function PlanCard({ plan }: Props) {
  const isPrasadam = plan.icon === 'cutlery';
  const Icon = isPrasadam ? PrasadamIcon : DarshanIcon;
  const Banner = isPrasadam ? PrasadamBanner : TempleBanner;
  const themeClass = isPrasadam ? 'theme-prasadam' : 'theme-darshan';

  const hasImage = !!plan.image;
  const [view, setView] = useState<View>(() => {
    if (!plan.image) return 'text';
    return readSavedView(plan.image.id) ?? 'image';
  });

  useEffect(() => {
    if (plan.image) saveView(plan.image.id, view);
  }, [plan.image, view]);

  // Match card paper to the image's sampled background while the image view is on.
  // Reverts to the default gradient when the user toggles to Steps.
  const showImage = hasImage && view === 'image';
  const cardStyle: React.CSSProperties | undefined =
    showImage && plan.image?.bg ? { background: plan.image.bg } : undefined;

  return (
    <div className={`plan ${plan.variant} ${themeClass}`} style={cardStyle}>
      <div className="plan-banner" aria-hidden="true">
        <Banner />
      </div>
      <div className="plan-head">
        <Icon className="plan-glyph" />
        <div>
          <div className="t">{plan.title}</div>
          <p>
            <Html html={plan.description} />
          </p>
        </div>
        {hasImage && <ViewToggle view={view} onChange={setView} />}
      </div>
      {plan.lunch && (
        <div className="lunch">
          {plan.lunch.map((l) => (
            <div key={l.name} className="lunch-opt">
              <div className="lo-name">{l.name}</div>
              <div className="lo-meta">{l.meta}</div>
            </div>
          ))}
        </div>
      )}
      {plan.lunchNote && <div className="lunch-note">{plan.lunchNote}</div>}

      {showImage ? (
        <PlanRouteImage image={plan.image!} />
      ) : (
        <RouteTimeline steps={plan.steps} theme={isPrasadam ? 'prasadam' : 'darshan'} />
      )}
    </div>
  );
}
