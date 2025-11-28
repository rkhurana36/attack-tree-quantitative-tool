// frontend/src/KindDropdown.tsx
import { useState } from "react";

export type KindOption = "Asset" | "Control" | "Technique" | "Other";

const COLORS: Record<KindOption, string> = {
  Asset:   "#7c3aed",
  Control: "#10b981",
  Technique:  "#ef4444",
  Other:   "#6b7280",
};

export default function KindDropdown({
  value,
  onChange,
  disabled = false,
}: {
  value: KindOption;
  onChange: (k: KindOption) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) setOpen((o) => !o);
  };

  const pick = (k: KindOption) => {
    onChange(k);
    setOpen(false);
  };

  return (
    <div
      style={{ position: "relative", userSelect: "none" }}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* CURRENT VALUE */}
      <div
        onClick={toggle}
        style={{
          background: COLORS[value],
          color: "white",
          fontSize: 11,
          padding: "3px 10px",
          borderRadius: 999,
          cursor: disabled ? "default" : "pointer",
          opacity: disabled ? 0.5 : 1,
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </div>

      {/* POPOVER MENU */}
      {open && !disabled && (
  <div
    style={{
      position: "absolute",
      top: "105%",          // closer to the pill
      left: 0,              // align under the pill
      transform: "translateX(-5px)", // small inward nudge
      background: "white",
      border: "1px solid #e5e7eb",
      padding: 6,
      borderRadius: 10,
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      zIndex: 999,
      minWidth: "100%",    // keeps it neat

    }}
  >
          {(Object.keys(COLORS) as KindOption[]).map((k) => (
            <div
              key={k}
              onClick={(e) => {
                e.stopPropagation();
                pick(k);
              }}
              style={{
  padding: "3px 6px",
  marginBottom: 4,
  borderRadius: 999,
  fontSize: 11,
  background: COLORS[k],
  color: "white",
  cursor: "pointer",
  whiteSpace: "nowrap",
}}
            >
              {k}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}