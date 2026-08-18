import { type ReactNode } from "react";
 
// Smooth-scroll (Lenis) has been disabled — it was causing scroll to freeze
// entirely on some laptop trackpad/browser combinations. This component now
// just passes children through untouched, so the site uses plain native
// browser scrolling everywhere. Safe, simple, works on 100% of devices.
export default function SmoothScroll({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
 