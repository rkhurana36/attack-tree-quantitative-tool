export async function loadGraph(graphId: string) {
  const res = await fetch(`/api/graphs/${graphId}/`, { credentials: 'include' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}