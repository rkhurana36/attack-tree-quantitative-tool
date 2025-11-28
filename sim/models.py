from django.conf import settings
from django.db import models
from django.contrib.auth.models import User
import uuid

from django.utils import timezone


class Scenario(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='scenarios')

    # optional: link to one or more attack graphs
    attack_graphs = models.ManyToManyField('AttackGraph', blank=True, related_name='scenarios')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    # FAIR inputs
    tef_min = models.FloatField(default=0.1)
    tef_ml = models.FloatField(default=0.3)
    tef_max = models.FloatField(default=0.6)

    vuln_min = models.FloatField(default=0.05)
    vuln_ml = models.FloatField(default=0.2)
    vuln_max = models.FloatField(default=0.5)

    # --- New loss decomposition fields ---
    # Primary Loss Magnitude
    plm_min = models.FloatField(default=10000.0)
    plm_ml = models.FloatField(default=50000.0)
    plm_max = models.FloatField(default=150000.0)

    # Secondary Loss Event Frequency
    slef_min = models.FloatField(default=0.05)
    slef_ml = models.FloatField(default=0.2)
    slef_max = models.FloatField(default=0.4)

    # Secondary Loss Magnitude
    slm_min = models.FloatField(default=5000.0)
    slm_ml = models.FloatField(default=25000.0)
    slm_max = models.FloatField(default=100000.0)

    # Derived totals
    lef_estimate = models.FloatField(default=0.0)
    lm_estimate = models.FloatField(default=0.0)
    ale_estimate = models.FloatField(default=0.0)


    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    primary_attack_graph = models.ForeignKey(
        "AttackGraph", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="primary_for_scenarios"
    )
    VULN_SOURCE_CHOICES = (("manual", "Manual"), ("graph", "AttackGraph"))
    vuln_source = models.CharField(max_length=16, choices=VULN_SOURCE_CHOICES, default="manual")

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title

    def compute_derived_values(self):
        """
        Deprecated deterministic FAIR math.
        Kept for compatibility but does nothing —
        Monte Carlo results now drive these fields.
        """
        pass


class AttackGraph(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    arrival = models.JSONField(default=dict, blank=True)   # {"dist":"PERT","min":0.5,"mode":1,"max":2}
    metadata = models.JSONField(default=dict, blank=True)  # controls, capability, loss
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="attack_graphs",
    )
    visibility = models.CharField(
        max_length=20,
        choices=[("private", "Private"), ("org", "Organization"), ("public", "Public")],
        default="private",
    )
    def __str__(self):
        return self.title


class AttackGraphResult(models.Model):
    graph = models.ForeignKey("AttackGraph", on_delete=models.CASCADE, related_name="results")
    created_at = models.DateTimeField(default=timezone.now)
    method = models.CharField(max_length=32, default="montecarlo")  # or "dag-analytic"
    samples = models.IntegerField(default=20000)

    # summary stats for success probability of the graph (0..1)
    mean = models.FloatField()
    p10  = models.FloatField()
    p50  = models.FloatField()
    p90  = models.FloatField()

    # optional: store seed/config for reproducibility
    seed = models.IntegerField(null=True, blank=True)

class Node(models.Model):
    graph = models.ForeignKey(AttackGraph, related_name="nodes", on_delete=models.CASCADE)
    #graph = models.ForeignKey(AttackGraph, related_name="nodes", on_delete=models.CASCADE)
    node_id = models.CharField(max_length=64)
    label = models.CharField(max_length=200)
    kind = models.CharField(max_length=24, blank="Asset")
    node_type = models.CharField(  # NEW: which React Flow component to use
        max_length=32,
        choices=(('triangular', 'triangular'), ('foothold', 'foothold'), ('goal', 'goal')),
        default='triangular'
    )
    p_succ = models.JSONField(default=dict, blank=True)
    p_detect = models.JSONField(default=dict, blank=True)
    controls = models.JSONField(default=list, blank=True)  # ["email","waf"]
    weights = models.JSONField(default=dict, blank=True)   # {"cap":1,"ctrl":1,"k":5}
    ui = models.JSONField(default=dict, blank=True)

    class Meta:
        unique_together = ('graph', 'node_id')

class Edge(models.Model):
    graph = models.ForeignKey(AttackGraph, related_name="edges", on_delete=models.CASCADE)
    edge_id = models.CharField(max_length=64)
    source = models.CharField(max_length=64)
    target = models.CharField(max_length=64)
    type = models.CharField(max_length=16, default="follows")  # "follows"|"requires"
