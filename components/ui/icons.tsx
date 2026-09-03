import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 18, children, ...rest }: P) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const Icon = {
  Steps: (p: P) => (
    <Svg {...p}>
      <path d="M9 6h12M9 12h12M9 18h12" />
      <path d="M3.5 5.5L4.5 5v3M3.5 12.5h2l-2 2.5h2M3.5 17h1.5a1 1 0 0 1 0 2H4.5a1 1 0 0 1 0 2H3.5" />
    </Svg>
  ),
  Ref: (p: P) => (
    <Svg {...p}>
      <rect x="3" y="5" width="14" height="14" rx="2" />
      <path d="M17 9l4-2v10l-4-2" />
      <path d="M7 12h6M7 15h4" />
    </Svg>
  ),
  Convert: (p: P) => (
    <Svg {...p}>
      <path d="M4 7h11l-3-3M20 17H9l3 3" />
      <path d="M4 7v2a3 3 0 0 0 3 3h2M20 17v-2a3 3 0 0 0-3-3h-2" />
    </Svg>
  ),
  Bell: (p: P) => (
    <Svg {...p}>
      <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </Svg>
  ),
  Globe: (p: P) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </Svg>
  ),
  Upload: (p: P) => (
    <Svg {...p}>
      <path d="M12 16V5M7 10l5-5 5 5" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </Svg>
  ),
  At: (p: P) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-4 7.5" />
    </Svg>
  ),
  Chev: (p: P) => (
    <Svg {...p}>
      <path d="M6 9l6 6 6-6" />
    </Svg>
  ),
  X: (p: P) => (
    <Svg {...p}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  ),
  Download: (p: P) => (
    <Svg {...p}>
      <path d="M12 4v11M7 10l5 5 5-5" />
      <path d="M4 19h16" />
    </Svg>
  ),
  Alert: (p: P) => (
    <Svg {...p}>
      <path d="M12 3l10 18H2L12 3z" />
      <path d="M12 10v5" />
      <path d="M12 18h.01" />
    </Svg>
  ),
  Refresh: (p: P) => (
    <Svg {...p}>
      <path d="M20 12a8 8 0 1 1-2.3-5.7" />
      <path d="M20 4v5h-5" />
    </Svg>
  ),
  Clip: (p: P) => (
    <Svg {...p}>
      <path d="M15 7l-6.5 6.5a2.5 2.5 0 0 0 3.5 3.5L19 10a5 5 0 0 0-7-7L5 10" />
    </Svg>
  ),
  Folder: (p: P) => (
    <Svg {...p}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </Svg>
  ),
  Play: (p: P) => (
    <Svg {...p}>
      <path d="M8 5v14l11-7z" fill="currentColor" stroke="none" />
    </Svg>
  ),
  Trash: (p: P) => (
    <Svg {...p}>
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
    </Svg>
  ),
  Link: (p: P) => (
    <Svg {...p}>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.5 1.5" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.5-1.5" />
    </Svg>
  ),
  Search: (p: P) => (
    <Svg {...p}>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-4.5-4.5" />
    </Svg>
  ),
  Film: (p: P) => (
    <Svg {...p}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 5v14M17 5v14M3 10h4M3 14h4M17 10h4M17 14h4" />
    </Svg>
  ),
  Heart: (p: P) => (
    <Svg {...p}>
      <path d="M12 20.5s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 8a4.2 4.2 0 0 1 7.5 2.5c0 5.4-7.5 10-7.5 10z" />
    </Svg>
  ),
  Comment: (p: P) => (
    <Svg {...p}>
      <path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4A8 8 0 1 1 20 12z" />
    </Svg>
  ),
  Share: (p: P) => (
    <Svg {...p}>
      <path d="M21 3L10 14M21 3l-7 18-4-7-7-4z" />
    </Svg>
  ),
  Bookmark: (p: P) => (
    <Svg {...p}>
      <path d="M6 3h12v18l-6-4-6 4z" />
    </Svg>
  ),
  /** 인스타그램 인증 배지 (파랑 채움) */
  Verified: ({ size = 16, ...rest }: P) => (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-label="인증됨" role="img" {...rest}>
      <path d="M12 2l2.4 2.2 3.2-.5 1 3.1 2.9 1.5-1.2 3 1.2 3-2.9 1.5-1 3.1-3.2-.5L12 22l-2.4-2.2-3.2.5-1-3.1-2.9-1.5 1.2-3-1.2-3 2.9-1.5 1-3.1 3.2.5z" fill="#0095F6" />
      <path d="M8.5 12.5l2.3 2.3 4.7-4.8" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  GlobeSearch: (p: P) => (
    <Svg {...p}>
      <circle cx="10" cy="10" r="7" />
      <path d="M3 10h14M10 3a11 11 0 0 1 0 14M10 3a11 11 0 0 0 0 14" />
      <path d="M21 21l-4.5-4.5" />
    </Svg>
  ),
};
