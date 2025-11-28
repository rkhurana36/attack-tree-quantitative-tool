from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from sim.models import AttackGraph, Scenario
from sim.serializers import AttackGraphSerializer, ScenarioSerializer
from .simulate import SimNode, run_trials
from sim.fair_run import simulate_scenario_mc

class IsOwner(permissions.BasePermission):
    """Custom permission: only owners can view/edit their graphs."""

    def has_object_permission(self, request, view, obj):
        # Handle objects that have an owner directly
        if hasattr(obj, "owner"):
            return obj.owner == request.user

        # Handle derived objects linked through a graph
        if hasattr(obj, "graph") and hasattr(obj.graph, "owner"):
            return obj.graph.owner == request.user

        # Default: deny access if ownership cannot be determined
        return False

class AttackGraphViewSet(viewsets.ModelViewSet):
    serializer_class = AttackGraphSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def get_queryset(self):
        # Only allow access to this user's graphs
        return AttackGraph.objects.filter(owner=self.request.user) or self.request.user.is_superuser

    def perform_create(self, serializer):
        # Automatically set the owner when a new graph is created
        serializer.save(owner=self.request.user)

    # Correct, current simulation
    @action(detail=True, methods=["post"])
    def simulate(self, request, pk=None):
        graph: AttackGraph = self.get_object()

        try:
            runs = int(request.data.get("trials", 5000))
            runs = max(100, min(runs, 200_000))  # guardrails
        except Exception:
            runs = 5000

        seed = request.data.get("seed")
        seed = int(seed) if seed is not None else None

        # Map DB -> SimNode
        nodes = [
            SimNode(
                node_id=n.node_id,
                node_name=getattr(n, "label"),
                node_type=getattr(n, "node_type", "triangular"),
                kind=getattr(n, "kind", "Asset"),
                p_succ=(n.p_succ or {}),
            )
            for n in graph.nodes.all()
        ]
        edges = [(e.source, e.target) for e in graph.edges.all()]

        if not nodes:
            return Response(
                {"detail": "Graph has no nodes."},
                status=status.HTTP_400_BAD_REQUEST
            )

        result = run_trials(nodes, edges, trials=runs, seed=seed)
        return Response(result, status=status.HTTP_200_OK)

""" 
Scenario viewsets, for implementation of FAIR scenario simulation as a backup method to evaluate FAIR scenarios.
Not considered main scope of project, but partial implementation remains. Remains here for completeness.
"""

class ScenarioViewSet(viewsets.ModelViewSet):
    serializer_class = ScenarioSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def get_queryset(self):
        qs = Scenario.objects.filter(owner=self.request.user)
        return Scenario.objects.all() if self.request.user.is_superuser else qs

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=["post"])
    def simulate(self, request, pk=None):
        scenario = self.get_object()
        trials = int(request.data.get("trials", 20000))
        seed = request.data.get("seed")
        seed = int(seed) if seed is not None else None

        # Build specs from scenario fields
        tef_spec = {"dist": "TRIANGULAR", "min": scenario.tef_min, "mode": scenario.tef_ml, "max": scenario.tef_max}
        vuln_spec = {"dist": "TRIANGULAR", "min": scenario.vuln_min, "mode": scenario.vuln_ml, "max": scenario.vuln_max}
        plm_spec  = {"dist": "TRIANGULAR", "min": scenario.plm_min, "mode": scenario.plm_ml, "max": scenario.plm_max}
        slef_spec = {"dist": "TRIANGULAR", "min": scenario.slef_min, "mode": scenario.slef_ml, "max": scenario.slef_max}
        slm_spec  = {"dist": "TRIANGULAR", "min": scenario.slm_min, "mode": scenario.slm_ml, "max": scenario.slm_max}

        summary = simulate_scenario_mc(
            tef_spec=tef_spec, vuln_spec=vuln_spec,
            plm_spec=plm_spec, slef_spec=slef_spec, slm_spec=slm_spec,
            trials=trials, seed=seed
        )

        # Optionally persist to model
        scenario.ale_estimate = summary["p50"]
        scenario.save(update_fields=["ale_estimate"])

        return Response({"summary": summary})

    @action(detail=True, methods=["post"])
    def refresh_vulnerability(self, request, pk=None):
        """Pull latest AttackGraphResult into scenario.vuln_* if vuln_source=graph."""
        scenario = self.get_object()
        if scenario.vuln_source != "graph" or not scenario.primary_attack_graph:
            return Response({"detail":"vuln_source is not 'graph' or no primary_attack_graph set."}, status=400)

        latest = scenario.primary_attack_graph.results.order_by("-created_at").first()
        if not latest:
            return Response({"detail":"No graph result found."}, status=404)

        scenario.vuln_min = latest.p10
        scenario.vuln_ml  = latest.p50
        scenario.vuln_max = latest.p90
        scenario.compute_derived_values()
        scenario.save()
        return Response(ScenarioSerializer(scenario).data)