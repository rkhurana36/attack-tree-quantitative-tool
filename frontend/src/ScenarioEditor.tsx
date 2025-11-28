// frontend/src/ScenarioEditor.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import ReactFlow, {
  Background,
  Controls,
  useEdgesState,
  useNodesState,
  MarkerType,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import "./index.css";
import TriangularNode from "./TriangularNode";
// previously used helpers:
import { loadScenario as apiLoadScenario, patchScenario, listGraphs} from "./scenariotoApi";

const SCENARIO_ID = (window as any).SCENARIO_ID || "default";
console.log("✅ ScenarioEditor booted, SCENARIO_ID =", SCENARIO_ID);





function ScenarioCanvas() {
  const nodeTypes = useMemo(() => ({ triangular: TriangularNode }), []);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [status, setStatus] = useState("");
  const [layer, setLayer] = useState<"TEF" | "VULN" | "LOSS">("TEF");

  // Scenario metadata (vuln_source, primary_attack_graph, etc.)
  const [scenarioMeta, setScenarioMeta] = useState<any>(null);
  const [graphs, setGraphs] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  //const [setShowGraphPicker] = useState(false);
  const [linkedGraphTitle, setLinkedGraphTitle] = useState<string | null>(null);
//const [setGraphResult] = useState<any | null>(null);
const [refreshKey, setRefreshKey] = useState(0);

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  useEffect(() => { nodesRef.current = nodes; edgesRef.current = edges; }, [nodes, edges]);



  async function loadGraphs() {
  try {
    setStatus("Loading available graphs…");
    const g = await listGraphs();
    setGraphs(g);
    //setShowGraphPicker(true);
    setStatus("Select an attack graph to link");
  } catch (err) {
    console.warn("Failed to list graphs:", err);
    setStatus("Graph load failed");
  }
}

const runScenarioSimulation = async () => {
  try {
    setStatus("Running Monte Carlo…");
    const res = await fetch(`/api/scenarios/${SCENARIO_ID}/simulate/`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": window.CSRF_TOKEN ?? "",
      },
      body: JSON.stringify({ trials: 20000 }),
    });

    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();

    const { summary } = data;
    const { p10, p50, p90 } = summary;

    // ✅ Update ALE node in graph visually
    setNodes((ns) =>
      ns.map((n) =>
        n.id === "ale"
          ? {
              ...n,
              data: {
                ...n.data,
                values: { min: p10, ml: p50, max: p90 },
              },
            }
          : n
      )
    );

    // ✅ Optionally, update scenarioMeta to keep consistent state
    setScenarioMeta((prev: any) =>
      prev
        ? { ...prev, ale_estimate: p50 }
        : { ale_estimate: p50 }
    );

    // ✅ Update status line for user feedback
    setStatus(
      `Monte Carlo complete → ALE p10=${p10.toFixed(2)}, p50=${p50.toFixed(
        2
      )}, p90=${p90.toFixed(2)}`
    );
    setTimeout(() => setStatus(""), 4000);
  } catch (err) {
    console.error("Scenario simulation failed:", err);
    setStatus("Monte Carlo simulation failed");
  }
};

async function handleSelectGraph(graphId: string) {
  setStatus("Running attack graph simulation…");
  try {
    // call the existing backend: POST /api/graphs/:id/simulate/
    const r = await fetch(`/api/graphs/${graphId}/simulate/`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": (window as any).CSRF_TOKEN || "",
      },
      body: JSON.stringify({ trials: 20000 }),
    });

    if (!r.ok) {
      setStatus(`Simulation failed (${r.status})`);
      return;
    }

    const data = await r.json();
    // use the aggregate the backend already returns
    const vuln = Number(data?.success_rate_any_goal ?? 0);
    console.log(data)

    // Prefer the new success_distribution shape
    const dist = data?.success_distribution;
    const vuln_min = Number(dist?.p10 ?? data?.success_rate_any_goal ?? 0);
    const vuln_ml  = Number(dist?.p50 ?? data?.success_rate_any_goal ?? 0);
    const vuln_max = Number(dist?.p90 ?? data?.success_rate_any_goal ?? 0);

    // persist on scenario (set all three to the same scalar)
    await patchScenario(SCENARIO_ID, {
      vuln_min,
      vuln_ml,
      vuln_max,
      vuln_source: "graph",
      primary_attack_graph: graphId,
    });

    // Immediately update local UI
    setScenarioMeta((m: any) => ({ ...(m || {}), vuln_source: "graph" }));
    setNodes((ns) =>
      ns.map((n) =>
        n.id === "vuln"
          ? {
              ...n,
              data: {
                ...n.data,
                editable: false,
                badge: `from: ${linkedGraphTitle || "attack graph"}`,
              },
            }
          : n
      )
    );
    setRefreshKey((k) => k + 1);

    // optional: show the chosen title if we have graphs loaded
    const selected = graphs.find((g) => g.id === graphId);
    if (selected) setLinkedGraphTitle(selected.title);

    setStatus(`Linked to graph (Vulnerability = ${(vuln * 100).toFixed(1)}%)`);

    // reload your canvas so the Vulnerability node picks up new values
    await loadAll();
  } catch (err) {
    console.error(err);
    setStatus("Failed to link or simulate graph");
  }
}
/*
async function loadGraphResults(graphId: string) {
  try {
    const r = await fetch(`/api/graphs/${graphId}/results/`, { credentials: "include" });
    if (r.status === 404) {
      setGraphResult(null);
      setStatus("No graph results yet.");
      return;
    }
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    setGraphResult(data);
    // Optionally reflect p50 into the vuln node values visually
    setNodes(ns => ns.map(n =>
      n.id === "vuln"
        ? { ...n, data: { ...n.data, values: { min: data.p10, ml: data.p50, max: data.p90 } } }
        : n
    ));
    setStatus("Loaded graph results");
  } catch (e) {
    console.error("Load graph results failed", e);
    setStatus("Load graph results failed");
  }
} */

/*
async function runGraphAndReload(graphId: string) {
  try {
    setStatus("Simulating graph…");
    const r = await fetch(`/api/graphs/${graphId}/simulate/`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", "X-CSRFToken": (window as any).CSRF_TOKEN || "" },
      body: JSON.stringify({ samples: 20000 })
    });
    if (!r.ok) throw new Error(await r.text());
    await loadGraphResults(graphId);
    setStatus("Graph simulated");
  } catch (e) {
    console.error(e);
    setStatus("Graph simulate failed");
  }
} */
  // load scenario + graphs on mount
  const loadAll = useCallback(async () => {
  setStatus("Loading…");
  try {
    const s = await apiLoadScenario(SCENARIO_ID);
    console.log("Loaded scenario:", s);

    // Save scenario meta first
    setScenarioMeta(s);

    // Build nodes from scenario fields
    const n: any[] = [
      {
        id: "tef",
        type: "triangular",
        position: { x: -400, y: 450 },
        data: {
          label: "Threat Event Frequency",
          valueType: "probability",
          values: { min: s.tef_min, ml: s.tef_ml, max: s.tef_max },
          editable: layer === "TEF",
          onChangeValues: (v: any) => onChangeValues("tef", v),
        },
      },
      {
        id: "vuln",
        type: "triangular",
        position: { x: 0, y: 450 },
        data: {
          label: "Vulnerability",
          valueType: "probability",
          values: { min: s.vuln_min, ml: s.vuln_ml, max: s.vuln_max },
          editable: s.vuln_source !== "graph" && layer === "VULN",
          onChangeValues: (v: any) => onChangeValues("vuln", v),
          badge:
            s.vuln_source === "graph"
              ? "from attack graph"
              : null,
        },
      },
      {
        id: "lef",
        type: "triangular",
        position: { x: -200, y: 250 },
        data: {
          label: "Loss Event Frequency",
          valueType: "probability",
          values: { min: s.lef_estimate, ml: s.lef_estimate, max: s.lef_estimate },
          editable: false,
        },
      },
      {
        id: "plm",
        type: "triangular",
        position: { x: 400, y: 450 },
        data: {
          label: "Primary Loss Magnitude",
          valueType: "magnitude",
          values: { min: s.plm_min, ml: s.plm_ml, max: s.plm_max },
          editable: true,
          onChangeValues: (v: any) => onChangeValues("plm", v),
        },
      },
      {
        id: "slef",
        type: "triangular",
        position: { x: 650, y: 650 },
        data: {
          label: "Secondary Loss Event %",
          valueType: "probability",
          values: { min: s.slef_min, ml: s.slef_ml, max: s.slef_max },
          editable: true,
          onChangeValues: (v: any) => onChangeValues("slef", v),
        },
      },
      {
        id: "slm",
        type: "triangular",
        position: { x: 950, y: 650 },
        data: {
          label: "Secondary Loss Magnitude",
          valueType: "magnitude",
          values: { min: s.slm_min, ml: s.slm_ml, max: s.slm_max },
          editable: true,
          onChangeValues: (v: any) => onChangeValues("slm", v),
        },
      },
      {
        id: "sl",
        type: "triangular",
        position: { x: 800, y: 450 },
        data: {
          label: "Secondary Loss",
          valueType: "magnitude",
          values: { min: s.slm_min, ml: s.slm_ml, max: s.slm_max },
          editable: true,
          onChangeValues: (v: any) => onChangeValues("slm", v),
        },
      },
      {
        id: "lm",
        type: "triangular",
        position: { x: 600, y: 250 },
        data: {
          label: "Loss Magnitude",
          valueType: "magnitude",
          values: { min: s.lm_estimate, ml: s.lm_estimate, max: s.lm_estimate },
          editable: false,
        },
      },
      {
        id: "ale",
        type: "triangular",
        position: { x: 200, y: 50 },
        data: {
          label: "Annualized Loss Expectancy",
          valueType: "magnitude",
          values: { min: s.ale_estimate, ml: s.ale_estimate, max: s.ale_estimate },
          editable: false,
        },
      },
    ];

    const e = [
      { id: "e1", source: "lef", target: "vuln", markerEnd: { type: MarkerType.ArrowClosed } },
      { id: "e4", source: "lef", target: "tef", markerEnd: { type: MarkerType.ArrowClosed } },
      { id: "e5", source: "ale", target: "lef", markerEnd: { type: MarkerType.ArrowClosed } },
      { id: "e6", source: "lm", target: "plm", markerEnd: { type: MarkerType.ArrowClosed } },
      { id: "e7", source: "sl", target: "slef", markerEnd: { type: MarkerType.ArrowClosed } },
      { id: "e71", source: "sl", target: "slm", markerEnd: { type: MarkerType.ArrowClosed } },
      { id: "e8", source: "lm", target: "sl", markerEnd: { type: MarkerType.ArrowClosed } },
      { id: "e9", source: "ale", target: "lm", markerEnd: { type: MarkerType.ArrowClosed } },
    ];

    setNodes(n);
    setEdges(e);

    // ✅ Now handle linked graphs safely
    try {
      const g = await listGraphs();
      setGraphs(g);
      //setShowGraphPicker(true);

      if (s.attack_graphs && s.attack_graphs.length > 0) {
        const linked = s.attack_graphs[0];
        console.log(linked.title)
        setLinkedGraphTitle(linked.title);
        setScenarioMeta((prev: any) =>
          prev ? { ...prev, primary_attack_graph: linked.id } : { primary_attack_graph: linked.id }
        );
      } else {
        setLinkedGraphTitle(null);
      }
    } catch (err) {
      console.warn("Failed to list graphs:", err);
    }

    setStatus("Loaded");
  } catch (err) {
    console.error("loadAll failed:", err);
    setStatus("Load error");
  }
}, [layer]);


  useEffect(() => {
    void loadAll();
  }, [loadAll]);



  // onChangeValues from node -> patch scenario field
  const onChangeValues = useCallback((id: string, vals: any) => {
    setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, values: vals } } : n)));
    // map node id -> scenario field name
    const mapping: Record<string, string> = {
      tef: "tef",
      vuln: "vuln",
      plm: "plm",
      slef: "slef",
      slm: "slm",
    };
    const prefix = mapping[id];
    if (prefix) {
      const patch: any = {};
      patch[`${prefix}_min`] = vals.min;
      patch[`${prefix}_ml`] = vals.ml;
      patch[`${prefix}_max`] = vals.max;
      // debounce/pause - lightweight: call patchScenario directly but don't block UI
      (async () => {
        try {
          setBusy(true);
          const updated = await patchScenario(SCENARIO_ID, patch);
          setScenarioMeta(updated);
        } catch (err) {
          console.error("Patch scenario failed:", err);
        } finally {
          setBusy(false);
        }
      })();
    }
  }, []);

  // handler: change vuln_source (manual or graph)
const onChangeVulnSource = useCallback(async (value: string) => {
  // Optimistic update: reflect immediately in UI
  setScenarioMeta((m: any) => ({ ...(m || {}), vuln_source: value }));
  setStatus("Updating scenario…");
  setBusy(true);

  try {
    await patchScenario(SCENARIO_ID, { vuln_source: value });
    // only reload once server confirms
    setStatus("Scenario updated");
    // small delay to let backend save before reload
    setTimeout(() => {
      void loadAll();
    }, 3000);
  } catch (err) {
    console.error("Failed to change vuln_source", err);
    setStatus("Failed to update");
  } finally {
    setBusy(false);
    setTimeout(() => setStatus(""), 2000);
  }
}, [loadAll]);

/*
  // handler: change primary graph
  const onChangePrimaryGraph = useCallback(async (graphId: string | null) => {
    try {
      setBusy(true);
      const patch: any = { primary_attack_graph: graphId };
      const updated = await patchScenario(SCENARIO_ID, patch);
      setScenarioMeta(updated);
      await loadAll();
    } catch (err) {
      console.error("Failed to change primary graph", err);
    } finally {
      setBusy(false);
    }
  }, [loadAll]);
*/
/*
  // handler: run graph simulate + refresh
  const onRunGraphAndRefresh = useCallback(async () => {
    if (!scenarioMeta?.primary_attack_graph) return;
    try {
      setBusy(true);
      setStatus("Simulating graph…");
      await simulateGraph(scenarioMeta.primary_attack_graph, 20000);
      setStatus("Refreshing vulnerability…");
      await refreshVulnerability(SCENARIO_ID);
      // reload scenario & nodes to reflect new vuln values
      await loadAll();
      setStatus("Updated from graph");
    } catch (err) {
      console.error("Graph simulate/refresh failed:", err);
      setStatus("Graph simulation failed");
    } finally {
      setBusy(false);
      setTimeout(() => setStatus(""), 2500);
    }
  }, [scenarioMeta, loadAll]);
*/
// Update the vuln node's editability when vuln_source or layer changes
useEffect(() => {
  setNodes((ns) =>
    ns.map((n) =>
      n.id === "vuln"
        ? {
            ...n,
            data: {
              ...n.data,
              editable: layer === "VULN" && scenarioMeta?.vuln_source !== "graph",
              badge:
                scenarioMeta?.vuln_source === "graph"
                  ? `from: ${linkedGraphTitle || "attack graph"}`
                  : null,
            },
          }
        : n
    )
  );
}, [layer, scenarioMeta?.vuln_source, linkedGraphTitle]);

  // toolbar UI + canvas
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div style={{ position: "absolute", top: 8, left: 8, zIndex: 10, background: "#fff8", borderRadius: 8, padding: "6px", display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setLayer("TEF")}>TEF</button>
          <button onClick={() => setLayer("VULN")}>Vuln</button>
          <button onClick={() => setLayer("LOSS")}>Loss</button>
          <button onClick={loadGraphs}>Select Attack Graph Source</button>
          <button onClick={runScenarioSimulation}>Run Scenario Simulation</button>

        </div>

        <div style={{ marginLeft: 8 }}>
          <label style={{ fontSize: 12, opacity: 0.8 }}>Vuln source</label>
          <select value={scenarioMeta?.vuln_source || "manual"} onChange={(e) => onChangeVulnSource(e.target.value)}>
            <option value="manual">Manual</option>
            <option value="graph">Attack Graph</option>
          </select>



        </div>

        {scenarioMeta?.vuln_source === "graph" && (
          <div style={{ marginLeft: 8 }}>
            <label style={{ fontSize: 12, opacity: 0.8 }}>Graph</label>
            <select
              value={scenarioMeta?.primary_attack_graph || ""}
              onChange={(e) => handleSelectGraph(e.target.value || "")}
            >
              <option value="">— select graph —</option>
              {graphs.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
            </select>
          </div>
        )}



        <div style={{ marginLeft: 8 }}>
          <span style={{ opacity: 0.8 }}>{status}</span>
          {busy && <span style={{ marginLeft: 6 }}>⏳</span>}
        </div>
      </div>

      <ReactFlow
        key={refreshKey}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        style={{ width: "100%", height: "100%" }}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export default function ScenarioEditor() {
  return (
    <ReactFlowProvider>
      <ScenarioCanvas />
    </ReactFlowProvider>
  );
}

// mount (if your file previously mounted itself)
const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <ScenarioEditor />
  </React.StrictMode>
);
