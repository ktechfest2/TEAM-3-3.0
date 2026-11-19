"use client";

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="switch"
      disabled={disabled}
      onClick={() => { if (!disabled) onChange(!checked); }}
      style={disabled ? { opacity: 0.45, cursor: "not-allowed" } : undefined}
    >
      <i />
    </button>
  );
}
