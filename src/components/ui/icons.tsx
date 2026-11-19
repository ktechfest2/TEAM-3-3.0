import type { ReactNode, SVGProps } from "react";

const P = (d: string) => <path d={d} />;

const paths: Record<string, ReactNode> = {
  home: P("M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10"),
  pin: <><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  scan: <><path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" /><path d="M4 12h16" /></>,
  help: P("M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12Z"),
  user: <><circle cx="12" cy="8" r="4" /><path d="M4.5 20c.8-3.6 3.9-5.5 7.5-5.5s6.7 1.9 7.5 5.5" /></>,
  check: P("M5 12.5l4.5 4.5L19 7.5"),
  alert: <><path d="M10.3 4.2 2.9 17.3A2 2 0 0 0 4.6 20.3h14.8a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4.5M12 16.8v.01" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.8v.01" /></>,
  mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></>,
  speaker: <><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z" /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></>,
  plus: P("M12 5v14M5 12h14"),
  x: P("M6 6l12 12M18 6 6 18"),
  chevronRight: P("M9.5 6l6 6-6 6"),
  chevronLeft: P("M14.5 6l-6 6 6 6"),
  chevronDown: P("M6 9.5l6 6 6-6"),
  chevronUp: P("M6 14.5l6-6 6 6"),
  send: P("M21 3 10.5 13.5M21 3l-6.5 18-4-7.5L3 9.5 21 3Z"),
  shield: <><path d="M12 3l7.5 2.8v5.7c0 4.6-3.1 8.3-7.5 9.5-4.4-1.2-7.5-4.9-7.5-9.5V5.8L12 3Z" /><path d="M8.8 12l2.2 2.2 4.2-4.4" /></>,
  flag: P("M5 21V4M5 4h11l-1.8 4 1.8 4H5"),
  arrowUp: P("M12 19V5M5.5 11.5 12 5l6.5 6.5"),
  camera: <><path d="M4 8.5A2 2 0 0 1 6 6.5h1.6l1.4-2h6l1.4 2H18a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8.5Z" /><circle cx="12" cy="12.5" r="3.5" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></>,
  trash: P("M5 7h14M10 7V4.5h4V7M7 7l.8 12.5h8.4L17 7M10.5 11v5M13.5 11v5"),
  bell: P("M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15L6 16.5ZM10 20.5a2 2 0 0 0 4 0"),
  external: P("M14 4h6v6M20 4l-9 9M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"),
  ledger: P("M12 3 3 8l9 5 9-5-9-5ZM3 12.5l9 5 9-5M3 16.5l9 5 9-5"),
  inbox: P("M4 13.5 6.5 5h11L20 13.5M4 13.5V18a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 18v-4.5h-4.5l-1 2h-5l-1-2H4Z"),
};

export type IconName = keyof typeof paths;

export function Icon({ name, size = 22, ...rest }: { name: IconName; size?: number } & Omit<SVGProps<SVGSVGElement>, "name">) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...rest}>
      {paths[name]}
    </svg>
  );
}
