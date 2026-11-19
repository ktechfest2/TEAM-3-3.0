import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/** Shimmering placeholder. Always give it the final size of the content to avoid layout jumps. */
export function Skeleton({ w, h = 14, r, className, style }: { w?: number | string; h?: number | string; r?: number | string; className?: string; style?: CSSProperties }) {
  return <div aria-hidden="true" className={cn("skeleton", className)} style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

export const CardSkeleton = ({ lines = 3, h }: { lines?: number; h?: number }) => (
  <div className="card stack stack-3" role="status" aria-label="Loading" style={h ? { minHeight: h } : undefined}>
    <Skeleton w="45%" h={20} />
    {Array.from({ length: lines }, (_, i) => <Skeleton key={i} w={i === lines - 1 ? "70%" : "100%"} />)}
  </div>
);

export const ListSkeleton = ({ rows = 4 }: { rows?: number }) => (
  <div className="card card--flush list" role="status" aria-label="Loading">
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="list-row">
        <Skeleton w={40} h={40} r="50%" />
        <div className="grow stack stack-2"><Skeleton w="60%" h={16} /><Skeleton w="35%" h={12} /></div>
      </div>
    ))}
  </div>
);

export const StatsSkeleton = () => (
  <div className="grid-3" role="status" aria-label="Loading">
    {[0, 1, 2].map((i) => <Skeleton key={i} h={72} r={14} />)}
  </div>
);

export const FactSkeleton = () => (
  <div className="card stack stack-3" role="status" aria-label="Loading">
    <div className="row"><Skeleton w={70} h={20} r={10} /><Skeleton w={56} h={12} /></div>
    <Skeleton h={22} /><Skeleton w="85%" h={22} />
    <Skeleton /><Skeleton w="60%" />
  </div>
);
