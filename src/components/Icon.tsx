const PATHS: Record<string, string> = {
  home: 'M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10',
  skills: 'M6 6h.01M18 6h.01M12 18h.01M6 6l6 12M18 6l-6 12M6 6h12',
  record: 'M4 19V9M10 19V5M16 19v-8M22 19H2',
  terminal: 'M4 5h16v14H4zM8 10l3 2-3 2M13 15h4',
  flame: 'M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 .3 1.5 1 2 2 2 0-3-1-5 1-8z',
  bolt: 'M13 3 5 13.5h6L10 21l8-10.5h-6z',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  x: 'M6 6l12 12M18 6 6 18',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M5 11h14v9H5z',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  back: 'm15 5-7 7 7 7',
  chevron: 'm9 5 7 7-7 7',
  play: 'M7 4.5v15l12-7.5z',
  hint: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z',
  swap: 'M4 8h13l-3-3M20 16H7l3 3',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
  reset: 'M4 12a8 8 0 1 0 3-6.2M4 4v4h4',
  copy: 'M8 8h11v12H8zM5 16V4h11',
  clock: 'M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
  trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',
  stop: 'M6 6h12v12H6z',
  keyboard: 'M3 6h18v12H3zM7 10h.01M11 10h.01M15 10h.01M7 14h10',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z',
  target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
};

export function Icon({ name, size = 20, stroke = 1.6 }: { name: keyof typeof PATHS | string; size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={{ flex: 'none' }}>
      <path d={PATHS[name] ?? PATHS.sparkle} />
    </svg>
  );
}

/** Difficulty as a row of six tiny depth bars. */
export function Depth({ d }: { d: number }) {
  const n = Math.max(1, Math.min(6, Math.round((d - 350) / 230)));
  const hs = [5, 6, 8, 9, 11, 12];
  return <span className="depth" role="img" aria-label={`Depth ${Math.round(d)}`}>{hs.map((h, i) => <i key={i} className={i < n ? 'on' : ''} style={{ height: h }} />)}</span>;
}

export function Meter({ frac, thick }: { frac: number; thick?: boolean }) {
  return <div className={`meter${thick ? ' thick' : ''}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(frac * 100)}><i style={{ width: `${Math.max(0, Math.min(1, frac)) * 100}%` }} /></div>;
}
