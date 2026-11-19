"use client";
import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { usePrefs } from "@/stores/prefs";

/**
 * Smooth scroll ONLY where it helps: a precise pointer with hover (mouse/trackpad).
 * Touch devices keep native momentum scrolling, which always feels better than a JS imitation.
 * Anything with data-lenis-prevent (sheets, chat lists) scrolls natively.
 */
export function LenisProvider() {
  const reduceMotion = usePrefs((s) => s.reduceMotion);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = reduceMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;

    const lenis = new Lenis({ lerp: 0.12, smoothWheel: true, syncTouch: false, anchors: true });
    let raf = 0;
    const loop = (t: number) => { lenis.raf(t); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); lenis.destroy(); };
  }, [reduceMotion]);

  return null;
}
