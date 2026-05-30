import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const base: IconProps = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 };

export const TrainIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="4" y="3" width="16" height="14" rx="3" />
    <path d="M4 11h16M8 17l-2 4M16 17l2 4" />
    <circle cx="8.5" cy="14" r="1" fill="currentColor" />
    <circle cx="15.5" cy="14" r="1" fill="currentColor" />
  </svg>
);

export const HotelIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M3 21h18M5 21V8l7-5 7 5v13" />
    <path d="M9 21v-6h6v6" />
  </svg>
);

export const HomeIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M3 12 12 3l9 9M5 10v10h14V10" />
  </svg>
);

export const ClockIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

export const PinIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 21s-6-5.7-6-10a6 6 0 0 1 12 0c0 4.3-6 10-6 10z" />
    <circle cx="12" cy="11" r="2.5" />
  </svg>
);

export const ShieldIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 2 4 7v6c0 5 3.5 7.5 8 9 4.5-1.5 8-4 8-9V7l-8-5z" />
    <path d="M12 7v8M9 11h6" />
  </svg>
);

export const CutleryIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M3 2v7a3 3 0 0 0 6 0V2M6 2v20M16 2c-1.5 0-3 2-3 6s1.5 4 3 4 3 0 3-4-1.5-6-3-6zM16 12v10" />
  </svg>
);

export const AlertIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
  </svg>
);

export const SpinnerIcon = (p: IconProps) => (
  <svg {...base} {...p} className={(p.className ? p.className + ' ' : '') + 'spin'}>
    <path d="M21 12a9 9 0 1 1-6.2-8.5" />
  </svg>
);

export const CheckIcon = (p: IconProps) => (
  <svg {...base} {...p} strokeWidth={3}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const TrashIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </svg>
);

export const LockIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

export const UnlockIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 7.5-2" />
  </svg>
);

export const PaperclipIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="m21.4 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 17.93 8.83l-8.49 8.49a2 2 0 0 1-2.83-2.83l7.07-7.07" />
  </svg>
);

// Prasadam: stylised banana-leaf platter with a mound of rice + sides.
export const PrasadamIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...p}>
    {/* leaf outline — elongated oval with a tip */}
    <path d="M3 14c0-3.5 4-6 9-6s9 2.5 9 6c0 2-2 4-5 4H8c-3 0-5-2-5-4z" fill="currentColor" fillOpacity=".08" />
    {/* central rice mound */}
    <ellipse cx="12" cy="14" rx="2.8" ry="1.4" fill="currentColor" fillOpacity=".55" stroke="none" />
    {/* small side dishes */}
    <circle cx="7" cy="14" r="1" fill="currentColor" stroke="none" />
    <circle cx="17" cy="14" r="1" fill="currentColor" stroke="none" />
    {/* steam wisps above */}
    <path d="M10 5c.5 1 -.5 1.5 0 2.5M12 4c.5 1 -.5 1.5 0 2.5M14 5c.5 1 -.5 1.5 0 2.5" strokeWidth={1.4} />
  </svg>
);

// Compact stop-marker icons for RouteTimeline pins. ~16-20px in use.
export const StopGopuramIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M5 22V11h14v11" fill="currentColor" fillOpacity=".18" />
    <path d="M7 11V7h10v4" />
    <path d="M9 7V5h6v2" />
    <path d="M10 5L12 2l2 3" />
    <path d="M11 22v-4a1 1 0 0 1 2 0v4" />
  </svg>
);

export const StopPlateIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="12" cy="14" r="7" fill="currentColor" fillOpacity=".14" />
    <circle cx="12" cy="14" r="3" fill="currentColor" fillOpacity=".55" stroke="none" />
    <path d="M9 5c.4.8-.3 1.2 0 2M12 4c.4.8-.3 1.2 0 2M15 5c.4.8-.3 1.2 0 2" strokeWidth={1.4} />
  </svg>
);

export const StopTrainIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="5" y="4" width="14" height="13" rx="3" fill="currentColor" fillOpacity=".14" />
    <path d="M5 11h14" />
    <circle cx="9" cy="14" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="14" r="1" fill="currentColor" stroke="none" />
    <path d="M8 17l-1.5 3M16 17l1.5 3" />
  </svg>
);

export const StopBedIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M3 18V8m18 10v-7a3 3 0 0 0-3-3H10v6" />
    <path d="M3 13h18" fill="currentColor" fillOpacity=".18" />
    <circle cx="7" cy="11" r="2" fill="currentColor" fillOpacity=".3" />
  </svg>
);

export const StopClockIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="12" cy="12" r="8" fill="currentColor" fillOpacity=".14" />
    <path d="M12 7v5l3 2" />
  </svg>
);

// Darshan: temple gopuram silhouette with a vel (lance) accent.
export const DarshanIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...p}>
    {/* base platform */}
    <path d="M4 21h16" />
    {/* stepped gopuram body */}
    <path d="M5 21v-4h14v4" fill="currentColor" fillOpacity=".08" />
    <path d="M6 17v-3h12v3" />
    <path d="M8 14v-3h8v3" />
    {/* finial peak */}
    <path d="M10 11 L12 8 L14 11" />
    {/* central vel tip rising from peak */}
    <path d="M12 8 V4" strokeWidth={1.8} />
    <path d="M11 5 L12 3 L13 5" strokeWidth={1.6} fill="currentColor" fillOpacity=".4" />
    {/* small entry arch */}
    <path d="M11 21v-2.5a1 1 0 0 1 2 0V21" />
  </svg>
);
