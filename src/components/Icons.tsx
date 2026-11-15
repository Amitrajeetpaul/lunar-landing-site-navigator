// Small inline icons (no icon library needed). All take a size and inherit colour from CSS.
const P = (d: string, size = 18) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);
export const IconPin = ({ size }: { size?: number }) => (
  <svg width={size ?? 18} height={size ?? 18} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" /></svg>
);
export const IconCheck = ({ size }: { size?: number }) => (
  <svg width={size ?? 18} height={size ?? 18} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1.2 14.2-3.9-3.9 1.4-1.4 2.5 2.5 5-5 1.4 1.4-6.4 6.4Z" /></svg>
);
export const IconMountain = ({ size }: { size?: number }) => (
  <svg width={size ?? 18} height={size ?? 18} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M2 20 9.5 7l4 6.5L16 10l6 10H2Z" /></svg>
);
export const IconBars = ({ size }: { size?: number }) => P('M4 4v16h16M8 16v-5M12 16V8M16 16v-3', size);
export const IconCompare = ({ size }: { size?: number }) => P('M4 5h7v14H4zM13 9h7v10h-7z', size);
export const IconLearn = ({ size }: { size?: number }) => P('M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2V5ZM6 18h13v3H6', size);
export const IconInfo = ({ size }: { size?: number }) => P('M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v5M12 8h.01', size ?? 16);
export const IconWarning = ({ size }: { size?: number }) => P('M12 4 2.8 20h18.4L12 4ZM12 10v4.5M12 17.5h.01', size ?? 16);
export const IconSun = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><g stroke="#f4b73f" strokeWidth="2" strokeLinecap="round"><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" /></g><circle cx="12" cy="12" r="4.2" fill="#f4b73f" /></svg>
);
export const IconEarth = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7.5" fill="#58a6ff" /></svg>
);
export const Logo = () => (
  <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
    <rect width="34" height="34" rx="9" fill="#f4b73f" />
    <path d="M21.5 8.5a9 9 0 1 0 4 12.4A8 8 0 0 1 21.5 8.5Z" fill="#101a3d" />
  </svg>
);
