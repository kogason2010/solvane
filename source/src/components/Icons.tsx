export function ArrowRight({ className = 'btn__arrow' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M1 8h13M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function ArrowDown({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 1v13M3 9l5 5 5-5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

/** Solvane mark: a resolved peak rising out of a ring — separation inside a column cross-section. */
export function BrandMark({ className = 'brand__mark' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="14.5" stroke="currentColor" strokeOpacity="0.45" />
      <path
        d="M3.5 21.5h5.2c1.6 0 2.3-0.6 3.1-3.2 1.2-4.1 2-12.3 4.2-12.3s3 8.2 4.2 12.3c0.8 2.6 1.5 3.2 3.1 3.2h5.2"
        stroke="url(#sv-g)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id="sv-g" x1="3" y1="0" x2="29" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#63d3ff" />
          <stop offset="1" stopColor="#c39bff" />
        </linearGradient>
      </defs>
    </svg>
  );
}
