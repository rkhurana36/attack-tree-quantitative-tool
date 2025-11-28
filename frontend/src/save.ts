// frontend/src/save.ts
import { toApi } from './toApi';
import type { Edge as RFEdge, Node as RFNode } from 'reactflow';

type SaveOpts = {
  title?: string | null;   // only send if non-empty
  csrf?: string;
};

/**
 * Safe save:
 * - use PATCH (don’t overwrite missing fields, unlike PUT)
 * - never send a default/empty title from autosaves
 */
export async function saveGraph(
  graphId: string,
  nodes: RFNode[],
  edges: RFEdge[],
  opts: SaveOpts = {}
) {
  const csrf = opts.csrf ?? (window as any).CSRF_TOKEN;

  // Build full mapping, then prune fields we don't want to overwrite.
  const full = toApi(graphId, nodes, edges);

  // Strip title unless an explicit non-empty title is passed.
/*  if (typeof opts.title === 'string' && opts.title.trim()) {
    full.title = opts.title.trim();
  } else {
    delete full.title;
  }
*/
  // Keep it truly partial: only send fields that we intend to update.
  const payload: Record<string, any> = {};
  if (full.nodes) payload.nodes = full.nodes;
  if (full.edges) payload.edges = full.edges;
  if (full.arrival) payload.arrival = full.arrival;     // include only if you actually want to update it
  if (full.metadata) payload.metadata = full.metadata;  // same here

  const res = await fetch(`/api/graphs/${graphId}/`, {
    method: 'PATCH',              // 🔑 critical: partial update
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrf,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
