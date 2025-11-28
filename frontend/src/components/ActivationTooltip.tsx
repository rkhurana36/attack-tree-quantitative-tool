// frontend/src/components/ActivationTooltip.tsx

export function ActivationTooltip({
  dist,
}: {
  dist: { mean: number; p10: number; p50: number; p90: number } | null;
}) {
  if (!dist) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: -6,
        right: -6,
        padding: "6px 10px",
        background: "rgba(0,0,0,0.80)",
        color: "white",
        fontSize: 11,
        borderRadius: 6,
        pointerEvents: "none",
        whiteSpace: "nowrap",
        zIndex: 10,
        transform: "translateY(-100%)",
      }}
    >
      <div style={{ fontWeight: 600, opacity: 0.9 }}>Activation Probability Range</div>
      <div>p10: {(dist.p10 * 100).toFixed(1)}%</div>
      <div>p50: {(dist.p50 * 100).toFixed(1)}%</div>
      <div>p90: {(dist.p90 * 100).toFixed(1)}%</div>
    </div>
  );
}