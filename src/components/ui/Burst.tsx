import { Icon } from "./icons";

/** The one-time orange "burst": rings expand from a solid orange core. Mount it to play it. */
export function Burst({ size = 76, label }: { size?: number; label?: string }) {
  return (
    <div className="burst-wrap" style={{ width: size, height: size }} role="img" aria-label={label ?? "Done"}>
      <span className="burst-ring" />
      <span className="burst-ring" />
      <span className="burst-core" style={{ width: size, height: size }}><Icon name="check" size={size * 0.46} strokeWidth={2.4} /></span>
    </div>
  );
}
