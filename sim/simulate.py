from __future__ import annotations
import random
from dataclasses import dataclass
from typing import Dict, List, Tuple
import numpy as np

@dataclass
class SimNode:
    node_id: str
    node_name: str
    node_type: str         # 'foothold' | 'triangular' | 'goal'
    kind: str              # 'Asset' | 'Control' | ...
    p_succ: Dict[str, float]  # {min, mode, max}

def topo_sort(nodes, edges):
    """
    Return nodes in topological order.
    Raises ValueError if a cycle exists.
    """
    # Build adjacency & indegree
    children = {n.node_id: [] for n in nodes}
    indeg = {n.node_id: 0 for n in nodes}

    for s, t in edges:
        children[s].append(t)
        indeg[t] += 1

    # Kahn’s algorithm
    queue = [nid for nid, d in indeg.items() if d == 0]
    ordered = []

    while queue:
        u = queue.pop()
        ordered.append(u)
        for v in children[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                queue.append(v)

    if len(ordered) != len(nodes):
        raise ValueError("Cycle detected in attack graph")

    return ordered, children

def draw_p(pdef: Dict[str, float]) -> float:
    """Draw a Bernoulli probability from a (min, mode, max) triangular/PERT."""
    if not pdef:
        return 0.0
    mn = float(pdef.get("min", 0.0))
    md = float(pdef.get("mode", pdef.get("ml", 0.0)))  # tolerate 'ml' or 'mode'
    mx = float(pdef.get("max", 1.0))
    # Python's triangular(low, high, mode)
    return max(0.0, min(1.0, random.triangular(mn, mx, md)))

def run_trials(
    nodes: List[SimNode],
    edges: List[Tuple[str, str]],
    trials: int = 20000,
    seed: int | None = None,
) -> Dict:
    """
    Deterministic Monte Carlo over node success probabilities.

    For each trial:
      - Sample a p_succ for every node from its (min, mode, max) spec.
      - Propagate *probabilities* through the graph (no inner Bernoulli).
      - Compute the probability that any goal is reached in that world.

    The result is a distribution over "probability attacker reaches any goal",
    which reflects uncertainty in the input triangular specs instead of
    collapsing to a narrow confidence interval around a single mean.
    """
    if seed is not None:
        random.seed(seed)

    # adjacency & parents
    children: Dict[str, List[str]] = {}
    parents: Dict[str, List[str]] = {}
    indeg: Dict[str, int] = {n.node_id: 0 for n in nodes}
    # ---- TOPOLOGICAL ORDER (do this ONCE) ----
    topo, _ = topo_sort(nodes, edges)

    for s, t in edges:
        children.setdefault(s, []).append(t)
        parents.setdefault(t, []).append(s)
        indeg[t] = indeg.get(t, 0) + 1

    by_id = {n.node_id: n for n in nodes}

    footholds = [n.node_id for n in nodes if n.node_type == "foothold"]
    goals = [n.node_id for n in nodes if n.node_type == "goal"]

    if not footholds:
        # If no explicit foothold, treat zero-indegree nodes as starting points
        footholds = [nid for nid, d in indeg.items() if d == 0]

    # Topological order for DAG-style propagation
    #topo: List[str] = []
    from collections import deque

    dq = deque([nid for nid, d in indeg.items() if d == 0])
    indeg_copy = dict(indeg)
    while dq:
        u = dq.popleft()
        topo.append(u)
        for v in children.get(u, []):
            indeg_copy[v] -= 1
            if indeg_copy[v] == 0:
                dq.append(v)

    # Metrics accumulated across trials
    any_goal_samples: List[float] = []
    node_prob_sum: Dict[str, float] = {n.node_id: 0.0 for n in nodes}
    node_samples: Dict[str, List[float]] = {n.node_id: [] for n in nodes}
    goal_prob_sum: Dict[str, float] = {g: 0.0 for g in goals}
    goal_samples: Dict[str, List[float]] = {g: [] for g in goals}

    for _ in range(trials):
        # 1) Sample p_succ for each node
        pmap: Dict[str, float] = {
            n.node_id: draw_p(n.p_succ) for n in nodes
        }

        # 2) Propagate reachability probabilities
        reach: Dict[str, float] = {n.node_id: 0.0 for n in nodes}

        for nid in topo:
            if nid in footholds:
                # foothold: attacker starts here with probability p_succ
                reach[nid] = pmap.get(nid, 0.0)
            else:
                ps = parents.get(nid, [])
                if not ps:
                    # orphan node with no parents and not a foothold: unreachable
                    reach[nid] = 0.0
                else:
                    # Probability that *any* parent is compromised
                    #   P(any parent) = 1 - Π (1 - reach[parent])
                    no_parent = 1.0
                    for p in ps:
                        no_parent *= (1.0 - reach[p])
                    parent_any = 1.0 - no_parent

                    # Node compromise probability given parents
                    reach[nid] = parent_any * pmap.get(nid, 0.0)

        # 3) Probability any goal is reached in this world
        if goals:
            no_goal = 1.0
            for g in goals:
                no_goal *= (1.0 - reach[g])
            any_goal_prob = 1.0 - no_goal
        else:
            any_goal_prob = 0.0

        any_goal_samples.append(any_goal_prob)

        # accumulate for node & goal activation "rates" - note - prob_sum deprecated with second order use but still used for color/etc.
        for nid in reach:
            node_prob_sum[nid] += reach[nid]
            node_samples[nid].append(reach[nid])
        for g in goals:
            goal_prob_sum[g] += reach[g]
            goal_samples[g].append(reach[g])

    # Deprecated: Node_prob_sum no longer needed since distributions provides more complete data but kept for legacy reasons - some frontend code depends on it
    node_activation_rates = {
        nid: node_prob_sum[nid] / float(trials) for nid in node_prob_sum
    }
    goal_success_rates = {
        g: goal_prob_sum[g] / float(trials) for g in goal_prob_sum
    }

    arr = np.array(any_goal_samples, dtype=float)
    mean = float(arr.mean()) if trials > 0 else 0.0
    p10 = float(np.percentile(arr, 10)) if trials > 0 else 0.0
    p50 = float(np.percentile(arr, 50)) if trials > 0 else 0.0
    p90 = float(np.percentile(arr, 90)) if trials > 0 else 0.0

    # Percentile distributions for each goal
    goal_distributions = {}
    for g, arr in goal_samples.items():
        arr = np.array(arr, float)
        goal_distributions[g] = {
            "mean": float(arr.mean()) if len(arr) > 0 else 0.0,
            "p10": float(np.percentile(arr, 10)) if len(arr) > 0 else 0.0,
            "p50": float(np.percentile(arr, 50)) if len(arr) > 0 else 0.0,
            "p90": float(np.percentile(arr, 90)) if len(arr) > 0 else 0.0,
        }

    node_distributions = {}
    for nid, arr in node_samples.items():
        arr = np.array(arr, float)
        if len(arr):
            node_distributions[nid] = {
                "mean": float(arr.mean()),
                "p10": float(np.percentile(arr, 10)),
                "p50": float(np.percentile(arr, 50)),
                "p90": float(np.percentile(arr, 90)),
            }
        else:
            node_distributions[nid] = {
                "mean": 0.0, "p10": 0.0, "p50": 0.0, "p90": 0.0
            }

    return {
        "trials": trials,
        "success_rate_any_goal": mean,
        "success_distribution": {
            "mean": mean,
            "p10": p10,
            "p50": p50,
            "p90": p90,
        },
        "goal_success_rates": goal_success_rates,  # preserved (means)
        "goal_distributions": goal_distributions,
        "node_activation_rates": node_activation_rates,
        "node_distributions": node_distributions,
    }


