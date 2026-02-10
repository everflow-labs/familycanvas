// components/ui/Logo.tsx
'use client';

/**
 * FamilyCanvas Logo — Clean Nodes (4-generation family tree)
 *
 * Grandparents (outlined) → Parents (filled) → You + Partner (filled) → Grandchildren (filled)
 * Sizes: xs (20px), sm (28px topbar), md (36px auth), lg (88px hero)
 */

type LogoSize = 'xs' | 'sm' | 'md' | 'lg';

type LogoProps = {
  /** Size preset */
  size?: LogoSize;
  /** Show the emerald gradient pill background */
  withBackground?: boolean;
  /** Additional className on the outer wrapper */
  className?: string;
};

const SIZE_CONFIG: Record<LogoSize, { pill: number; svg: number; radius: string }> = {
  xs: { pill: 22, svg: 13, radius: '6px' },
  sm: { pill: 28, svg: 16, radius: '8px' },
  md: { pill: 36, svg: 22, radius: '10px' },
  lg: { pill: 88, svg: 56, radius: '14px' },
};

function LogoSVG({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Gen 1: Grandparents — outlined circles */}
      <circle cx="9" cy="4" r="2" stroke="white" strokeWidth="1.1" fill="none" opacity="0.5" />
      <circle cx="23" cy="4" r="2" stroke="white" strokeWidth="1.1" fill="none" opacity="0.5" />

      {/* Lines to parents */}
      <line x1="9" y1="6" x2="12.5" y2="9.5" stroke="white" strokeWidth="0.8" opacity="0.3" />
      <line x1="23" y1="6" x2="19.5" y2="9.5" stroke="white" strokeWidth="0.8" opacity="0.3" />

      {/* Gen 2: Parents — filled, medium */}
      <circle cx="12.5" cy="11.5" r="2.3" fill="white" opacity="0.7" />
      <circle cx="19.5" cy="11.5" r="2.3" fill="white" opacity="0.7" />
      {/* Partner connector */}
      <line x1="14.8" y1="11.5" x2="17.2" y2="11.5" stroke="white" strokeWidth="0.9" opacity="0.4" />

      {/* Line to child */}
      <line x1="16" y1="13.8" x2="16" y2="17" stroke="white" strokeWidth="1.2" opacity="0.55" />

      {/* Gen 3: You — large filled */}
      <circle cx="16" cy="20" r="3.2" fill="white" />
      {/* Partner */}
      <circle cx="25" cy="20" r="2" fill="white" opacity="0.6" />
      <line x1="19.2" y1="20" x2="23" y2="20" stroke="white" strokeWidth="0.8" opacity="0.35" />

      {/* Lines to grandchildren */}
      <line x1="14.5" y1="23" x2="11.5" y2="26.5" stroke="white" strokeWidth="0.9" opacity="0.4" />
      <line x1="17.5" y1="23" x2="20.5" y2="26.5" stroke="white" strokeWidth="0.9" opacity="0.4" />

      {/* Gen 4: Grandchildren — small filled */}
      <circle cx="10.5" cy="28" r="1.5" fill="white" opacity="0.5" />
      <circle cx="21.5" cy="28" r="1.5" fill="white" opacity="0.5" />
    </svg>
  );
}

export default function Logo({ size = 'sm', withBackground = true, className = '' }: LogoProps) {
  const config = SIZE_CONFIG[size];

  if (!withBackground) {
    return (
      <div className={className} style={{ width: config.pill, height: config.pill, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LogoSVG size={config.svg} />
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        width: config.pill,
        height: config.pill,
        borderRadius: config.radius,
        background: 'linear-gradient(135deg, #34d399, #059669)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <LogoSVG size={config.svg} />
    </div>
  );
}
