import type { Node as RFNode, Edge as RFEdge} from 'reactflow';
import {
  MarkerType,
} from 'reactflow';
type ApiNode = {
  node_id: string;
  node_type?: string;
  label?: string;
  kind?: string;
  p_succ?: { min?: number; mode?: number; max?: number };
  ui?: { x?: number; y?: number; width?: number; height?: number };
};

type ApiEdge = { edge_id: string; source: string; target: string; type?: string };

export function mapFromApi(api: {
  nodes?: ApiNode[];
  edges?: ApiEdge[];
}) {
  const nodes: RFNode[] = (api.nodes ?? []).map((n, i) => ({
    id: n.node_id,
    type: n.node_type ?? 'triangular',
    position: {
      x: n.ui?.x ?? 100 + (i % 4) * 220,           // sensible defaults if missing
      y: n.ui?.y ?? 100 + Math.floor(i / 4) * 140,
    },
    data: {
      editable: true,
      label: n.label ?? 'Step',
      kind: (n as any).kind ?? 'Asset',
      values: {
        min: n.p_succ?.min ?? 0.05,
        ml:  n.p_succ?.mode ?? 0.15,
        max: n.p_succ?.max ?? 0.35,
      },
    },
  }));

  const edges: RFEdge[] = (api.edges ?? []).map((e) => ({
    id: e.edge_id,
    source: e.source,
    target: e.target,
    type: 'animatedEdge',
    selectable: true,
    interactionWidth: 24, // easier to click/tap
    data: { activationPct: 0 }, // default “no activation” heatmap state
    markerEnd: { type: MarkerType.ArrowClosed, }, // MarkerType.ArrowClosed (avoid importing MarkerType here)
  }));

  return { nodes, edges };
}
