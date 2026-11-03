// Line icons copied from the mockup SVGs (24x24, round caps). Color comes from `color`.
const paths = {
  back: <path d="M19 12H5M11 6l-6 6 6 6" />,
  home: <path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z" />,
  scan: <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10" />,
  pin: (
    <>
      <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.4" />
    </>
  ),
  bell: (
    <>
      <path d="M6 17V11a6 6 0 1 1 12 0v6l2 2H4z" />
      <path d="M10 21h4" />
    </>
  ),
  flame: <path d="M12 3c1 4 6 6 6 11a6 6 0 0 1-12 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 1-3-.5-6 2-9.5z" />,
  filter: (
    <>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </>
  ),
  chevron: <path d="M6 9l6 6 6-6" />,
  check: <path d="M5 12l5 5 9-10" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  warning: (
    <>
      <path d="M12 4L2.5 20h19z" />
      <path d="M12 10v4.5M12 17.2v.1" />
    </>
  ),
  question: <path d="M9 9a3 3 0 1 1 4.5 2.6c-1 .6-1.5 1.3-1.5 2.4M12 18v.1" />,
  bookmark: <path d="M6 4h12v17l-6-4-6 4z" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  flash: <path d="M13 3L5 14h6l-1 7 8-11h-6z" />,
  sign: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </>
  ),
  hole: <path d="M3 15c3-7 15-7 18 0-3 5-15 5-18 0z" />,
  barrier: <path d="M4 8h16v6H4zM7 14v7M17 14v7" />,
  bulb: (
    <>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z" />
    </>
  ),
};

export type IconName = keyof typeof paths;

export default function Icon({
  name,
  size = 22,
  color = "currentColor",
  strokeWidth = 2.2,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="flex-none"
    >
      {paths[name]}
    </svg>
  );
}
