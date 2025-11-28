import type { Edge as RFEdge, Node as RFNode } from 'reactflow';

export function toApi(graphId: string, rfNodes: RFNode[], rfEdges: RFEdge[]) {
  return {
    id: graphId,
    arrival: {},     // keep simple for now
    metadata: {},    // keep simple for now
    nodes: rfNodes.map((n) => ({
      node_id: n.id,
      node_type: n.type ?? 'triangular',
      label: n.data?.label ?? 'Step',
      kind: n.data?.kind ?? 'Asset',
      p_succ: { dist: 'PERT',
        min: n.data?.values?.min ?? 0,
        mode: n.data?.values?.ml ?? 0,
        max: n.data?.values?.max ?? 1
      },
      p_detect: n.data?.p_detect ?? {},
      controls: n.data?.controls ?? [],
      weights: n.data?.weights ?? {},
      ui: { x: n.position.x, y: n.position.y },
    })),
    edges: rfEdges.map((e) => ({
      edge_id: e.id,
      source: e.source,
      target: e.target,
      type: e.type ?? 'follows',
    })),
  };
}
