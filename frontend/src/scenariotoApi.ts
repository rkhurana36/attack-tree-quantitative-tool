// frontend/src/scenarioApi.ts

function getCSRFToken() {
  return (window as any).CSRF_TOKEN || "";
}

async function fetchWithAuth(url: string, opts: RequestInit = {}) {
  return fetch(url, {
    ...opts,
    credentials: "include",  // send session cookie
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCSRFToken(),
      ...(opts.headers || {}),
    },
  });
}

export async function runGraphSimulation(graphId: string) {
  const res = await fetch(`/api/graphs/${graphId}/simulate/`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": (window as any).CSRF_TOKEN || "",
    },
    body: JSON.stringify({ trials: 20000 }),
  });
  if (!res.ok) throw new Error(`Graph simulation failed: ${res.status}`);
  return await res.json();
}


export async function loadScenario(id: string) {
  const r = await fetch(`/api/scenarios/${id}/`);
  if (!r.ok) throw new Error("Failed to load scenario");
  return await r.json();
}

export async function patchScenario(id: string, patch: Record<string, any>) {
  const r = await fetchWithAuth(`/api/scenarios/${id}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(patch),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Failed to patch scenario: ${r.status} ${text}`);
  }
  return await r.json();
}

export async function listGraphs() {
  const r = await fetchWithAuth(`/api/graphs/`);
  if (!r.ok) throw new Error("Failed to fetch graphs");
  return await r.json(); // assume array of {id, title, latest_result}
}

export async function simulateGraph(graphId: string, samples = 20000, seed?: number) {
  const body: any = { samples };
  if (seed !== undefined) body.seed = seed;
  const r = await fetchWithAuth(`/api/graphs/${graphId}/simulate/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Graph simulate failed: ${r.status} ${text}`);
  }
  return await r.json(); // expect AttackGraphResultSerializer
}

export async function refreshVulnerability(scenarioId: string) {
  const r = await fetch(`/api/scenarios/${scenarioId}/refresh_vulnerability/`, {
    method: "POST",
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Refresh vulnerability failed: ${r.status} ${text}`);
  }
  return await r.json(); // returns the updated scenario
}
