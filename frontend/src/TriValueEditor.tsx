// frontend/src/TriValueEditor.tsx
// Old attempt to move Min/ML/Max value editor to a separate component - abandoned due to UI impact - will hit again later

/*
import React, { useState, useEffect } from "react";

export interface TriValue {
  min: number;
  ml: number;
  max: number;
}

export interface TriValueEditorProps {
  values: TriValue;
  editable: boolean;
  onChange: (vals: TriValue, commit?: boolean) => void;
}

export default function TriValueEditor({
  values,
  editable,
  onChange,
}: TriValueEditorProps) {
  const [min, setMin] = useState(values.min);
  const [ml, setMl] = useState(values.ml);
  const [max, setMax] = useState(values.max);

  const [rawMin, setRawMin] = useState(String(values.min));
  const [rawMl, setRawMl] = useState(String(values.ml));
  const [rawMax, setRawMax] = useState(String(values.max));

  // Sync when external values change
  useEffect(() => {
    setMin(values.min);
    setMl(values.ml);
    setMax(values.max);

    setRawMin(String(values.min));
    setRawMl(String(values.ml));
    setRawMax(String(values.max));
  }, [values.min, values.ml, values.max]);

  function commit(field: "min" | "ml" | "max", raw: string) {
    if (!editable) return;

    const v = parseFloat(raw);
    if (!Number.isFinite(v)) {
      setRawMin(String(min));
      setRawMl(String(ml));
      setRawMax(String(max));
      return;
    }

    const newVals = { min, ml, max, [field]: v } as any;

    // Soft ordering constraints
    if (field === "min") {
      newVals.min = v;
      if (v > newVals.ml) newVals.ml = v;
      if (v > newVals.max) newVals.max = v;
    }
    if (field === "ml") {
      newVals.ml = Math.max(newVals.min, v);
      if (newVals.ml > newVals.max) newVals.max = newVals.ml;
    }
    if (field === "max") {
      newVals.max = Math.max(newVals.ml, v);
    }

    setMin(newVals.min);
    setMl(newVals.ml);
    setMax(newVals.max);

    setRawMin(String(newVals.min));
    setRawMl(String(newVals.ml));
    setRawMax(String(newVals.max));

    onChange(
      {
        min: newVals.min,
        ml: newVals.ml,
        max: newVals.max,
      },
      true
    );
  }

  function step(field: "min" | "ml" | "max", delta: number) {
    if (!editable) return;
    const current =
      field === "min" ? rawMin : field === "ml" ? rawMl : rawMax;
    const newValue = (parseFloat(current) || 0) + delta;
    const s = String(Number(newValue.toFixed(3)));

    if (field === "min") setRawMin(s);
    if (field === "ml") setRawMl(s);
    if (field === "max") setRawMax(s);

    commit(field, s);
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 4,
        width: "100%",
      }}
    >
      // Min

      <div style={{ display: "flex", gap: 4 }}>
        <input
          value={rawMin}
          disabled={!editable}
          onChange={(e) => setRawMin(e.target.value)}
          onBlur={() => commit("min", rawMin)}
          style={{
            flex: 1,
            width: "100%",
            minWidth: 0,
            border: "none",
            background: "transparent",
            outline: "none",
            textAlign: "right",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <button
            disabled={!editable}
            onClick={() => step("min", +0.01)}
            style={{ fontSize: 10 }}
          >
            ▲
          </button>
          <button
            disabled={!editable}
            onClick={() => step("min", -0.01)}
            style={{ fontSize: 10 }}
          >
            ▼
          </button>
        </div>
      </div>

      //ML
      <div style={{ display: "flex", gap: 4 }}>
        <input
          value={rawMl}
          disabled={!editable}
          onChange={(e) => setRawMl(e.target.value)}
          onBlur={() => commit("ml", rawMl)}
          style={{
            flex: 1,
            width: "100%",
            minWidth: 0,
            border: "none",
            background: "transparent",
            outline: "none",
            textAlign: "right",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <button disabled={!editable} onClick={() => step("ml", +0.01)}>
            ▲
          </button>
          <button disabled={!editable} onClick={() => step("ml", -0.01)}>
            ▼
          </button>
        </div>
      </div>

      //Max
      <div style={{ display: "flex", gap: 4 }}>
        <input
          value={rawMax}
          disabled={!editable}
          onChange={(e) => setRawMax(e.target.value)}
          onBlur={() => commit("max", rawMax)}
          style={{
            flex: 1,
            width: "100%",
            minWidth: 0,
            border: "none",
            background: "transparent",
            outline: "none",
            textAlign: "right",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <button disabled={!editable} onClick={() => step("max", +0.01)}>
            ▲
          </button>
          <button disabled={!editable} onClick={() => step("max", -0.01)}>
            ▼
          </button>
        </div>
      </div>
    </div>
  );
} */