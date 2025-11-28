import type { Node as RFNode, Edge as RFEdge } from 'reactflow';

export function fromApi(api: any): { nodes: RFNode[]; edges: RFEdge[] } {
  const nodes = (api.nodes ?? []).map((n: any, i: number) => ({
    id: n.node_id,
    type: 'default',
    position: {
      x: n.ui?.x ?? 100 + (i % 4) * 200,
      y: n.ui?.y ?? 100 + Math.floor(i / 4) * 120,
    },
    data: { label: `${n.label} (${n.kind})` },
  }));
  const edges = (api.edges ?? []).map((e: any) => ({
    id: e.edge_id,
    source: e.source,
    target: e.target,
  }));
  return { nodes, edges };
}

export function toApi(graphId: string, rfNodes: RFNode[], rfEdges: RFEdge[], apiSnapshot: any) {
  // keep original data but update positions and ids
  return {
    id: graphId,
    title: apiSnapshot.title ?? 'Attack Graph',
    arrival: apiSnapshot.arrival ?? {},
    metadata: apiSnapshot.metadata ?? {},
    nodes: rfNodes.map((n) => {
      const prev = (apiSnapshot.nodes || []).find((x: any) => x.node_id === n.id) || {};
      return {
        node_id: n.id,
        label: prev.label ?? n.data?.label ?? n.id,
        kind: prev.kind ?? 'asset',
        p_succ: prev.p_succ ?? {},
        p_detect: prev.p_detect ?? {},
        controls: prev.controls ?? [],
        weights: prev.weights ?? {},
        ui: { x: n.position.x, y: n.position.y, width: (n as any).width, height: (n as any).height },
      };
    }),
    edges: rfEdges.map((e) => {
      const prev = (apiSnapshot.edges || []).find((x: any) => x.edge_id === e.id) || {};
      return { edge_id: e.id, source: e.source, target: e.target, type: prev.type ?? 'follows' };
    }),
  };
}
