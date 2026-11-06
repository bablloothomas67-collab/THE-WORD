import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function Base(props: IconProps) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    />
  );
}

export const HomeIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
    <path d="M10 21v-6h4v6" />
  </Base>
);

export const BookIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 5.5c3-1 6-.6 9 1.5 3-2.1 6-2.5 9-1.5V19c-3-1-6-.6-9 1.5C9 18.4 6 18 3 19z" />
    <path d="M12 7v13.5" />
  </Base>
);

export const AskIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 5h16v11H9l-5 4z" />
    <path d="M10 9.2a2 2 0 1 1 2.6 1.9c-.4.2-.6.5-.6.9v.4" />
    <path d="M12 14.2h.01" />
  </Base>
);

export const CompassIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.5 8.5-2 5-5 2 2-5z" />
  </Base>
);

export const JourneyIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 3h12v18l-6-4-6 4z" />
  </Base>
);

export const SunIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Base>
);

export const MoonIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
  </Base>
);

export const LogoMark = (p: IconProps) => (
  <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true" focusable="false" {...p}>
    <path
      d="M5 9c4-1.4 7.5-.8 11 1.6 3.5-2.4 7-3 11-1.6v15c-4-1.4-7.5-.8-11 1.6-3.5-2.4-7-3-11-1.6z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path d="M16 10.6v15.6" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);
