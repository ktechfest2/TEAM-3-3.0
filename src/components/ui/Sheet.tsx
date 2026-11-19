"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { IconButton } from "./Button";
import { Icon } from "./icons";

/** Bottom sheet: slides up on the iOS drawer curve, closes on Escape / backdrop, locks page scroll. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<Element | null>(null);

  useEffect(() => {
    if (open) { setMounted(true); setClosing(false); lastFocus.current = document.activeElement; }
    else if (mounted) {
      setClosing(true);
      const id = setTimeout(() => { setMounted(false); setClosing(false); (lastFocus.current as HTMLElement | null)?.focus?.(); }, 220);
      return () => clearTimeout(id);
    }
  }, [open, mounted]);

  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => { document.body.style.overflow = prev; };
  }, [mounted]);

  const onKey = useCallback((e: React.KeyboardEvent) => { if (e.key === "Escape") onClose(); }, [onClose]);

  if (!mounted || typeof document === "undefined") return null;
  return createPortal(
    <div className="sheet-backdrop" data-closing={closing} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }} onKeyDown={onKey}>
      <div ref={panel} className="sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <div className="sheet-grab" aria-hidden="true" />
        <div className="spread" style={{ marginBottom: 12 }}>
          <h2 className="title-2">{title}</h2>
          <IconButton label="Close" onClick={onClose}><Icon name="x" size={20} /></IconButton>
        </div>
        <div className="sheet-body" data-lenis-prevent>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
