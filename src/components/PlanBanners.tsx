import type { SVGProps } from 'react';

type Props = SVGProps<SVGSVGElement>;

/**
 * PrasadamBanner — a thin decorative strip showing repeating South-Indian
 * meal motifs: banana-leaf tips, a kalasha (water pot), and a brass bell.
 * Drawn at 320×28 viewBox; scales horizontally via preserveAspectRatio.
 * Single colour via currentColor.
 */
export function PrasadamBanner(props: Props) {
  return (
    <svg
      viewBox="0 0 320 28"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      stroke="currentColor"
      strokeWidth={1}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* hairline rails — top/bottom */}
      <line x1="0" y1="3" x2="320" y2="3" opacity=".35" />
      <line x1="0" y1="25" x2="320" y2="25" opacity=".35" />

      {/* repeating motif at x = 20, 60, 100, ... */}
      {Array.from({ length: 8 }).map((_, i) => {
        const x = 20 + i * 40;
        // alternate three motifs: leaf-tip, kalasha, bell
        const motif = i % 3;
        if (motif === 0) {
          // banana-leaf tip — pointed almond shape
          return (
            <g key={i} transform={`translate(${x},14)`}>
              <path d="M-9 0 Q0 -7 9 0 Q0 7 -9 0 Z" fill="currentColor" fillOpacity=".18" />
              <path d="M-7 0 L7 0" opacity=".55" />
            </g>
          );
        }
        if (motif === 1) {
          // kalasha: water-pot with a coconut on top
          return (
            <g key={i} transform={`translate(${x},14)`}>
              <ellipse cx="0" cy="3" rx="5" ry="4" fill="currentColor" fillOpacity=".22" />
              <path d="M-4 -1 L4 -1" />
              <circle cx="0" cy="-4" r="2" fill="currentColor" fillOpacity=".35" stroke="none" />
              <path d="M0 -7 Q-1 -8 0 -8.5 Q1 -8 0 -7" fill="currentColor" stroke="none" opacity=".5" />
            </g>
          );
        }
        // small brass bell with clapper
        return (
          <g key={i} transform={`translate(${x},14)`}>
            <path d="M-4 -3 Q-4 3 -5 5 L5 5 Q4 3 4 -3 Q4 -5 0 -5 Q-4 -5 -4 -3 Z" fill="currentColor" fillOpacity=".2" />
            <circle cx="0" cy="7" r=".9" fill="currentColor" stroke="none" />
            <line x1="0" y1="-5" x2="0" y2="-7" />
          </g>
        );
      })}
    </svg>
  );
}

/**
 * TempleBanner — a row of small gopuram silhouettes flanking a central
 * vel (Subramanya's lance). 320×28 viewBox, single colour.
 */
export function TempleBanner(props: Props) {
  return (
    <svg
      viewBox="0 0 320 28"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      stroke="currentColor"
      strokeWidth={1}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* hairline rails */}
      <line x1="0" y1="25" x2="320" y2="25" opacity=".45" />

      {/* row of gopurams flanking the center */}
      {(() => {
        const items: React.ReactElement[] = [];
        for (let i = 0; i < 7; i++) {
          const x = 30 + i * 44;
          // skip the slot under the central vel
          if (i === 3) continue;
          items.push(
            <g key={i} transform={`translate(${x},25)`}>
              {/* base */}
              <path d="M-10 0 V-6 H10 V0 Z" fill="currentColor" fillOpacity=".22" />
              {/* tier 2 */}
              <path d="M-8 -6 V-10 H8 V-6 Z" fill="currentColor" fillOpacity=".18" />
              {/* tier 3 */}
              <path d="M-6 -10 V-13 H6 V-10 Z" fill="currentColor" fillOpacity=".14" />
              {/* peak */}
              <path d="M-4 -13 L0 -18 L4 -13" />
              {/* archway */}
              <path d="M-2 0 V-3 a2 2 0 0 1 4 0 V0" />
            </g>,
          );
        }
        return items;
      })()}

      {/* central vel — leaf-shaped blade on a slim shaft */}
      <g transform="translate(160,14)">
        <line x1="0" y1="11" x2="0" y2="-2" strokeWidth={1.4} />
        <path d="M0 -10 Q-3 -6 0 -2 Q3 -6 0 -10 Z" fill="currentColor" fillOpacity=".55" />
        <circle cx="0" cy="11" r="1.4" fill="currentColor" stroke="none" />
      </g>
    </svg>
  );
}
