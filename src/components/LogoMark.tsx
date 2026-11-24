/** The Noctiluca mark in the Abyssal Liturgy palette: a single lit cell on a void field with one orbit. Pure strokes, no filters, sharp at 3x. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false" style={{ display: 'block', flex: 'none' }}>
      <rect x=".5" y=".5" width="31" height="31" rx="8" fill="#0d1013" stroke="#e6e3da" strokeOpacity=".22" />
      <ellipse cx="16" cy="16" rx="11.6" ry="6.8" transform="rotate(-24 16 16)" fill="none" stroke="#7c8891" strokeWidth="1" />
      <circle cx="16" cy="16" r="4.6" fill="#e6e3da" />
      <circle cx="24.4" cy="10.6" r="1.3" fill="#c9cfd2" />
      <circle cx="7.6" cy="21.4" r="1" fill="#7c8891" />
    </svg>
  );
}
