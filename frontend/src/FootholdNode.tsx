// frontend/src/FootholdNode.tsx
import { Handle, Position } from "reactflow";
import { useState, useEffect, useMemo } from "react";
import { ActivationTooltip } from "./components/ActivationTooltip";

type TriValues = { min: number; ml: number; max: number };

type Data = {
  label?: string;
  values?: TriValues;
  editable?: boolean;
  activationPct?: number;
  onChangeValues?: (vals: TriValues, valid: boolean) => void;
  onChangeTitle?: (title: string) => void;
  nodeDistribution?: {
      mean: number;
      p10: number;
      p50: number;
      p90: number
      } | null;
};

function parseNum(v: string, fallback: number) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

export default function FootholdNode({ data }: { data: Data }) {
  const init = data.values ?? { min: 0.05, ml: 0.15, max: 0.35 };
  const [hover, setHover] = useState(false);

  // RAW VALUES
  const [rawMin, setRawMin] = useState(String(init.min));
  const [rawMl, setRawMl] = useState(String(init.ml));
  const [rawMax, setRawMax] = useState(String(init.max));

  const [min, setMin] = useState(init.min);
  const [ml, setMl] = useState(init.ml);
  const [max, setMax] = useState(init.max);

  const [title, setTitle] = useState(data.label ?? "Foothold");

  // VALIDATION
  const validity = useMemo(() => {
    const ordered = min <= ml && ml <= max;
    const rangeOk = [min, ml, max].every((v) => v >= 0 && v <= 1);
    return { ok: ordered && rangeOk };
  }, [min, ml, max]);

  // COMMIT ON BLUR
  function commit(field: "min" | "ml" | "max", raw: string) {
    const v = parseNum(raw, NaN);

    if (!Number.isFinite(v)) {
      setRawMin(String(min));
      setRawMl(String(ml));
      setRawMax(String(max));
      return;
    }

    const next = { min, ml, max, [field]: v } as any;

    if (field === "min") {
      next.min = v;
      if (v > next.ml) next.ml = v;
      if (v > next.max) next.max = v;
    }
    if (field === "ml") {
      next.ml = Math.max(next.min, v);
      if (next.ml > next.max) next.max = next.ml;
    }
    if (field === "max") {
      next.max = Math.max(next.ml, v);
    }

    setMin(next.min);
    setMl(next.ml);
    setMax(next.max);

    data.onChangeValues?.(
      { min: next.min, ml: next.ml, max: next.max },
      validity.ok
    );

    setRawMin(String(next.min));
    setRawMl(String(next.ml));
    setRawMax(String(next.max));
  }

  // ACTIVATION ANIMATION
  const target = typeof data.activationPct === "number" ? data.activationPct : 0;
  const [displayActivation, setDisplayActivation] = useState(target);

  useEffect(() => {
    const duration = 2600;
    const fps = 60;
    const step = 1000 / fps;
    const alpha = 1 - Math.exp(-step / (duration / 5));

    const h = setInterval(() => {
      setDisplayActivation((prev) => {
        const next = prev + (target - prev) * alpha;
        if (Math.abs(next - target) < 0.001) return target;
        return next;
      });
    }, step);

    return () => clearInterval(h);
  }, [target]);

  const tint = `hsla(${50 - 50 * displayActivation}, 100%, ${
    97 - 25 * displayActivation
  }%, 1)`;

  const [showBadge, setShowBadge] = useState(false);
  useEffect(() => {
    if (typeof data.activationPct === "number") {
      const t = setTimeout(() => setShowBadge(true), 30);
      return () => clearTimeout(t);
    }
    setShowBadge(false);
  }, [data.activationPct]);

  const editable = data.editable !== false;
  const inputWrapper: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "4px 6px",
    border: `1px solid ${validity.ok ? "#e5e7eb" : "#fecaca"}`,
    borderRadius: 8,
    background: editable ? "#fff" : "#f3f4f6",
    opacity: editable ? 1 : 0.7,
  };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: tint,
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        minWidth: 160,
        maxWidth: 280,
        padding: 10,
        position: "relative",
        transition: "background 0.6s ease",
      }}
    >
      {/* TITLE */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <input
          disabled={!editable}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            data.onChangeTitle?.(e.target.value);
          }}
          style={{
            flex: 1,
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: "4px 8px",
            fontWeight: 600,
            background: editable ? "white" : "#f3f4f6",
          }}
        />
          <div
  style={{
    background: "#0ea5e9", // blue for foothold?
    color: "white",
    padding: "3px 6px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
  }}
>
  Foothold
</div>
      </div>

      {/* LABEL ROW */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "0 4px",
          marginTop: 10,
          marginBottom: 4,
          fontSize: 11,
          color: "#4b5563",
        }}
      >
        <div style={{ flex: 1, textAlign: "left" }}>Min</div>
        <div style={{ flex: 1, textAlign: "center" }}>Most Likely</div>
        <div style={{ flex: 1, textAlign: "right" }}>Max</div>
      </div>

      {/* INPUT GRID */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 6,
        }}
      >
        {[
          { k: "min", raw: rawMin, setRaw: setRawMin },
          { k: "ml", raw: rawMl, setRaw: setRawMl },
          { k: "max", raw: rawMax, setRaw: setRawMax },
        ].map(({ k, raw, setRaw }) => (
          <div
            key={k}
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              alignItems: "center",
              gap: 4,
              ...inputWrapper,
            }}
          >
            <input
              disabled={!editable}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              onBlur={() => commit(k as any, raw)}
              style={{
                flex: 1,
                width: "100%",
                minWidth: 0,
                border: "none",
                outline: "none",
                fontSize: 12,
                textAlign: "right",
                background: "transparent",
              }}
            />

            {editable && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <button
                  style={{
                    padding: 0,
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: 10,
                  }}
                  onClick={() => {
                    const curr = parseFloat(raw);
                    const next = Number.isFinite(curr) ? curr + 0.01 : 0.01;
                    const s = next.toFixed(2);
                    setRaw(s);
                    commit(k as any, s);
                  }}
                >
                  ▲
                </button>
                <button
                  style={{
                    padding: 0,
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: 10,
                  }}
                  onClick={() => {
                    const curr = parseFloat(raw);
                    const next = Number.isFinite(curr) ? curr - 0.01 : 0;
                    const s = next.toFixed(2);
                    setRaw(s);
                    commit(k as any, s);
                  }}
                >
                  ▼
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* VALIDATION */}
      <div
        style={{
          marginTop: 6,
          fontSize: 10,
          color: validity.ok ? "#6b7280" : "#b91c1c",
        }}
      >
        {validity.ok
          ? "Triangular/PERT inputs in [0,1]."
          : "Ensure Min ≤ ML ≤ Max and values ∈ [0,1]."}
      </div>

      {/* HANDLE — ONLY SOURCE (BOTTOM) */}
      <Handle id="out" type="source" position={Position.Bottom} />

      {/* ACTIVATION BADGE */}
      {typeof data.activationPct === "number" && (
        <div
          style={{
            position: "absolute",
            bottom: 4,
            right: 6,
            background: "rgba(0,0,0,0.6)",
            color: "white",
            fontSize: 11,
            borderRadius: 4,
            padding: "2px 5px",
            pointerEvents: "none",
            opacity: showBadge ? 1 : 0,
            transform: showBadge ? "translateY(0px)" : "translateY(4px)",
            transition: "opacity 2.6s ease, transform 2.6s ease",
          }}
        >
          {(displayActivation * 100).toFixed(1)}%
        </div>
      )}
  {hover && data.activationPct && data.nodeDistribution && (
  <ActivationTooltip dist={data.nodeDistribution} />
)}
    </div>
  );
}
