import { NIB } from "@/lib/nib";

/* The pen from the logo — a small drawn accent in the current text color. */
export function NibMark({ className = "w-10" }: { className?: string }) {
  return (
    <svg viewBox={`0 0 ${NIB.w} ${NIB.h}`} className={className}
         aria-hidden="true">
      <path d={NIB.d} fill="none" stroke="currentColor" strokeWidth={7}
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* A single hand-drawn rule — the divider a pen would make. */
export function PenRule({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 10" preserveAspectRatio="none"
         className={className} aria-hidden="true">
      <path d="M2,6 C60,3 110,8 170,5 S300,3 360,6 S500,8 598,4"
            fill="none" stroke="currentColor" strokeWidth={2}
            strokeLinecap="round" />
    </svg>
  );
}
