import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import ReactFlow, {
  getSmoothStepPath,
  Background,
  Controls,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  ReactFlowProvider,
    ConnectionMode,
  MarkerType,
} from 'reactflow';
import type { Connection, Edge as RFEdge, Node as RFNode } from 'reactflow';
import 'reactflow/dist/style.css';
import './index.css';
import { saveGraph } from './save';
import { loadGraph } from './api';
import { mapFromApi } from './mapFromApi';
import { newId, newEdgeId } from './id';
import type { EdgeProps } from "reactflow";

const GRAPH_ID = window.GRAPH_ID || "default";

import TriangularNode from './TriangularNode';
import FootholdNode from './FootholdNode';
import GoalNode from './GoalNode';


/*
const DEFAULT_EDGE_STYLE = {
  type: "animatedEdge",
  selectable: true,
  interactionWidth: 24,
  markerEnd: { type: MarkerType.ArrowClosed },
  data: { activationPct: 0 },
};*/


function AnimatedEdge(props: EdgeProps){
    const {
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  } = props;

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 10,
  });

  const activation = Math.min(1, Math.max(0, data?.activationPct ?? 0));
  const active = activation > 0.1;

  const color = `rgba(255, 0, 0, ${0.7 + 0.3 * activation})`;
  const dashSpeed = 1.45 - 1.35 * activation;

  return (
    <>
      <path
        id={id}
        d={edgePath}
        stroke={color}
        strokeWidth={1.5 + 2.5 * activation}
        fill="none"
        strokeDasharray={active ? "10 8" : "0"}
        style={{
          strokeWidth: 2 + 5 * activation,
          strokeLinecap: "round",
          transition: "all 0.8s ease-in-out",
          animation: active
            ? `flow-${id} ${dashSpeed}s linear infinite`
            : "none",
          opacity: active ? 1 : 0.8,
        }}
      />
      <style>{`
        @keyframes flow-${id} {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -18; }
        }
      `}</style>
    </>
  );
}

export const edgeTypes = { animatedEdge: AnimatedEdge };


// Heatmap: 0.0 → light yellow, 0.5 → orange, 1.0 → red
/*
function heatColor(rate: number) {
  const r = Math.max(0, Math.min(1, rate));
  const hue = 50 - 50 * Math.min(1, r * 1.2); // 50≈yellow → 0≈red
  const light = 92 - 45 * r;                  // lighter when low
  return `hsl(${hue}, 100%, ${light}%)`;
} */

function Palette() {
  return (
    <aside className="palette">
      <div
  className="palette-item"
  draggable
  onDragStart={(e) => {
    e.dataTransfer.setData('application/reactflow/type', 'foothold');
    e.dataTransfer.setData('application/reactflow/label', 'Foothold');
    e.dataTransfer.setData('application/reactflow/values', JSON.stringify({ min: 0.05, ml: 0.2, max: 0.5 }));
  }}
>🟢 Foothold</div>

<div
  className="palette-item"
  draggable
  onDragStart={(e) => {
    e.dataTransfer.setData('application/reactflow/type', 'triangular');
    e.dataTransfer.setData('application/reactflow/label', 'Step');
    e.dataTransfer.setData('application/reactflow/kind', 'Asset'); // default kind
    e.dataTransfer.setData('application/reactflow/values', JSON.stringify({ min: 0.05, ml: 0.15, max: 0.35 }));
  }}
>⬛ Step (Asset/Control…)</div>

<div
  className="palette-item"
  draggable
  onDragStart={(e) => {
    e.dataTransfer.setData('application/reactflow/type', 'goal');
    e.dataTransfer.setData('application/reactflow/label', 'Goal');
    e.dataTransfer.setData('application/reactflow/values', JSON.stringify({ min: 0.2, ml: 0.5, max: 0.9 }));
  }}
>🔴 Goal</div>
    </aside>
  );
}

function Canvas() {
  const [ghost, setGhost] = useState<{ x: number; y: number; label: string; type: string } | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<RFNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<RFEdge>([]);
  const nodeTypes = useMemo(() => ({
  triangular: TriangularNode,   // generic step (Asset/Control/etc chosen via badge)
  foothold: FootholdNode,
  goal: GoalNode,
}), []);
  const { project } = useReactFlow();

  const nodesRef = useRef<RFNode[]>([]);
const edgesRef = useRef<RFEdge[]>([]);

useEffect(() => { nodesRef.current = nodes; }, [nodes]);
useEffect(() => { edgesRef.current = edges; }, [edges]);
  const [status, setStatus] = useState('');
  const [simStatus, setSimStatus] = useState<string>("");
  // explicit save
const saveNow = useCallback(async () => {
  try {
    setStatus('Saving…');
    const nodesSnap = nodesRef.current;
    const edgesSnap = edgesRef.current;
    await saveGraph(GRAPH_ID, nodesSnap, edgesSnap);
    setStatus('Saved');
  } catch (e) {
    setStatus('Save error');
    console.error(e);
  }
}, []);

const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
const saveSoon = useCallback(() => {
  if (saveTimer.current) clearTimeout(saveTimer.current);
  saveTimer.current = setTimeout(() => { void saveNow(); }, 500);
}, [saveNow]);



const attachCallbacks = useCallback(
  (node: RFNode): RFNode => {
    const id = node.id;
    const d = (node.data || {}) as any;
    return {
      ...node,
      data: {
        ...d,
        onChangeValues: (vals: any) => {
          setNodes((ns) =>
            ns.map((n) =>
              n.id === id ? { ...n, data: { ...(n.data as any), values: vals } } : n
            )
          );
          saveSoon();
        },
        onChangeKind: (kind: any) => {
          setNodes((ns) =>
            ns.map((n) =>
              n.id === id ? { ...n, data: { ...(n.data as any), kind } } : n
            )
          );
          saveSoon();
        },
        onChangeTitle: (label: any) => {
          setNodes((ns) =>
            ns.map((n) =>
              n.id === id ? { ...n, data: { ...(n.data as any), label } } : n
            )
          );
          saveSoon();
        },
      },
    };
  },
  [setNodes]
);

// helper for an array
const withCallbacks = useCallback(
  (ns: RFNode[]) => ns.map(attachCallbacks),
  [attachCallbacks]
);

// LOAD on mount
  useEffect(() => {
    (async () => {
      try {
        setStatus('Loading…');
        const api = await loadGraph(GRAPH_ID);
        const { nodes, edges } = mapFromApi(api);
        setNodes(withCallbacks(nodes));
        //console.log("Current edges", edges.map(e => ({ id: e.id, type: e.type })));
        setEdges(edges);
        setStatus('Loaded');
      } catch (e: any) {
        console.error(e);
        setStatus('Load error');
      }
    })();
  }, [setNodes, setEdges]);


    // Optional: manual reload button uses same logic
  const reload = useCallback(async () => {
    try {
      setStatus('Loading…');
      const api = await loadGraph(GRAPH_ID);
      const { nodes, edges } = mapFromApi(api);
      setNodes(withCallbacks(nodes));
      setEdges(edges);
      setStatus('Loaded');
    } catch (e: any) {
      console.error(e);
      setStatus('Load error');
    }
  }, [setNodes, setEdges]);

// save after a node is dropped
const onNodeDragStop = useCallback(() => {
  saveNow();
}, [saveNow]);


const onNodesDelete = useCallback((deleted: RFNode[]) => {
  const removedIds = new Set(deleted.map((n) => n.id));
  setEdges((es) => es.filter((e) => !removedIds.has(e.source) && !removedIds.has(e.target)));
  // optionally auto-save:
  saveSoon();
}, [setEdges]);


// When user drags over canvas, move ghost
const onDragOver = useCallback((evt: React.DragEvent) => {
  evt.preventDefault();
  const bounds = (evt.currentTarget as HTMLElement).getBoundingClientRect();
  const position = project({
    x: evt.clientX - bounds.left,
    y: evt.clientY - bounds.top,
  });

  setGhost((g) => g ? { ...g, x: position.x, y: position.y } : null);
}, [project]);

const onDrop = useCallback((evt: React.DragEvent) => {
  evt.preventDefault();
  const bounds = (evt.currentTarget as HTMLElement).getBoundingClientRect();
  const position = project({
    x: evt.clientX - bounds.left,
    y: evt.clientY - bounds.top,
  });

  const type = evt.dataTransfer.getData('application/reactflow/type') || 'triangular';
  const label = evt.dataTransfer.getData('application/reactflow/label') || 'Step';

  const newNode: RFNode = {
    id: crypto.randomUUID(),
    type,
    position,
    data: { label, values: { min: 0.05, ml: 0.15, max: 0.35 }, kind: 'Asset', editable: true },
  };

  setNodes((ns) => ns.concat(attachCallbacks(newNode)));
  setGhost(null); // 🔑 remove ghost
}, [project, setNodes, attachCallbacks]);

const onEdgeClick = useCallback((_: any, edge: any) => {
  setEdges((es) => es.map(e => ({ ...e, selected: e.id === edge.id })));
  // (Optional) clear node selection:
  setNodes((ns) => ns.map(n => ({ ...n, selected: false })));
}, [setEdges, setNodes]);

  // Connect edges
  const onConnect = useCallback((c: Connection) => {
  const id = newEdgeId(c.source!, c.target!);
  setEdges((eds) =>
    addEdge(
      {
        ...c,
        id,
        type: 'animatedEdge',
        markerEnd: { type: MarkerType.ArrowClosed },
      },
      eds
    )
  );
  setTimeout(saveNow, 0);
}, [setEdges, saveNow]);

// Run backend simulation and color-code nodes by activation rate
const csrf = (window as any).CSRF_TOKEN;
const runSimulationHeatmap = useCallback(async () => {
  try {
    setSimStatus("Running simulation…");
    const res = await fetch(`/api/graphs/${GRAPH_ID}/simulate/`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", 'X-CSRFToken': csrf, },
      body: JSON.stringify({ trials: 20000 }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    console.log(data);
    const rates: Record<string, number> = data?.node_activation_rates || {};

    // Color nodes based on activation rates; also show % as a small badge line (if your node renders it)
    setNodes((ns) =>
      ns.map((n) => {
        const rate = rates[n.id] ?? 0;
        return {
          ...n,
          // style-only; nothing persisted
          style: {
            ...n.style,

          },
          data: {
            ...n.data,
            // Non-invasive: if your TriangularNode ignores this, nothing breaks
            activationPct: rate, // 0..1
            nodeDistribution: data.node_distributions?.[n.id] || null
          },
        };
      })
    );

    setEdges((es) =>
  es.map((e) => {
    const srcRate = rates[e.source] ?? 0;
    const tgtRate = rates[e.target] ?? 0;
    const importance = Math.sqrt(srcRate * tgtRate);

    return {
      ...e,
      data: { ...e.data, activationPct: importance },
      style: {
        ...e.style,
        transition: "all 0.8s ease-in-out",
      },
    };
  }) as any
);



    setSimStatus("Simulation complete");
    setTimeout(() => setSimStatus(""), 2000);
  } catch (err) {
    console.error("Simulation failed:", err);
    setSimStatus("Simulation failed");
    setTimeout(() => setSimStatus(""), 2500);
  }
}, [setNodes]);

// Clear the heatmap (restore neutral look)
const clearHeatmap = useCallback(() => {
  setNodes((ns) =>
    ns.map((n) => ({
      ...n,
      style: {
        ...n.style,
        backgroundColor: undefined,
        boxShadow: undefined,
      },
      data: {
        ...n.data,
        activationPct: undefined,
      },
    }))
  );

  setEdges((es) =>
  es.map((e) => ({
    ...e,
    data: { ...e.data, activationPct: 0 },
    style: {
      ...e.style,
      transition: "all 0.8s ease-in-out",
    },
  })) as any
);

  setSimStatus("");
}, [setNodes, setEdges]);

  // Delete selected with Delete/Backspace
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (isTyping) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
  setNodes((ns) => {
    const removed = ns.filter((n) => n.selected);
    if (removed.length) {
      const removedIds = new Set(removed.map((n) => n.id));
      setEdges((es) => es.filter((e) => !removedIds.has(e.source) && !removedIds.has(e.target)));
    }
    return ns.filter((n) => !n.selected);
  });
  setEdges((es) => es.filter((ed) => !ed.selected));
  saveSoon();
}
      // Duplicate selected (Ctrl/⌘ + D)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setNodes((ns) => {
          const sel = ns.find((n) => n.selected);
          if (!sel) return ns;
          const id = newId();
          const dup: RFNode = attachCallbacks({
            ...sel,
            id,
            position: { x: sel.position.x + 40, y: sel.position.y + 40 },
            selected: false,
          });
          return ns.concat(dup);
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setNodes, setEdges, attachCallbacks]);

  // Toolbar actions
 /* const deleteSelected = useCallback(() => {
  setNodes((ns) => {
    const removed = ns.filter((n) => n.selected);
    if (removed.length) {
      const removedIds = new Set(removed.map((n) => n.id));
      setEdges((es) => es.filter((e) => !removedIds.has(e.source) && !removedIds.has(e.target)));
    }
    return ns.filter((n) => !n.selected);
  });
  saveSoon();
}, [setNodes, setEdges]);
*/

/*  const duplicateSelected = useCallback(() => {
    setNodes((ns) => {
      const sel = ns.find((n) => n.selected);
      if (!sel) return ns;
      const id = newId();
      const dup: RFNode = attachCallbacks({
        ...sel,
        id,
        position: { x: sel.position.x + 40, y: sel.position.y + 40 },
        selected: false,
      });
      return ns.concat(dup);
    });
  }, [attachCallbacks, setNodes]);
*/
  return (

    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
    {/* overlay toolbar */}
    <div style={{
      position: 'absolute', zIndex: 10, left: 12, top: 12,
      display: 'flex', gap: 8, background: '#ffffffcc',
      border: '1px solid #cfd8dc', borderRadius: 8, padding: '6px 8px'
    }}>
      <button onClick={saveNow}>Save</button>
      <span>{status}</span>
        <button onClick={reload}>Load</button>
        <span>{status}</span>
        <button onClick={runSimulationHeatmap}>Simulate (heatmap)</button>
<button onClick={clearHeatmap}>Clear</button>
<span style={{ marginLeft: 6, opacity: 0.8 }}>{simStatus}</span>

    </div>

      {ghost && (
  <div
    style={{
      position: 'absolute',
      pointerEvents: 'none',
      transform: `translate(${ghost.x}px, ${ghost.y}px)`,
      opacity: 0.6,
      background: '#fff',
      border: '1px dashed #94a3b8',
      borderRadius: 12,
      padding: '8px 12px',
      fontWeight: 600,
      color: '#0f172a',
    }}
  >
    {ghost.label}
  </div>
)}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={(c) => onNodesChange(c)}
        onNodesDelete={onNodesDelete}
        onEdgesChange={onEdgesChange}
        onEdgeClick={onEdgeClick}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        fitView
          defaultEdgeOptions={{
    type: "animatedEdge",
    animated: false, // animation handled in our component logic
    style: { strokeWidth: 1.5, opacity: 0.7 },
  }}
        style={{ width: '100%', height: '100%' }}
        connectionMode={ConnectionMode.Strict}
          connectOnClick={false}
          isValidConnection={(c) => {
            if (!c.source || !c.target || c.source === c.target) return false;
            // If handles have IDs, enforce out → in
            if (c.sourceHandle && c.targetHandle) {
              return c.sourceHandle === 'out' && c.targetHandle === 'in';
            }
            return true;
          }}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export default function App() {
  return (
    <div className="app">
      <Palette />
      <ReactFlowProvider>
        <Canvas />
      </ReactFlowProvider>
    </div>
  );
}
