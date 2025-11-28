from rest_framework import serializers
from .models import AttackGraph, AttackGraphResult, Node, Edge, Scenario

class NodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Node
        fields = ("node_id","label","kind","node_type","p_succ","p_detect","controls","weights","ui")

class EdgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Edge
        fields = ("edge_id","source","target","type")

class AttackGraphSerializer(serializers.ModelSerializer):
    nodes = NodeSerializer(many=True)
    edges = EdgeSerializer(many=True)
    latest_result = serializers.SerializerMethodField()

    class Meta:
        model = AttackGraph
        fields = ("id","title","arrival","metadata","nodes","edges","updated_at","latest_result")

    def create(self, data):
        title = (data.get("title") or "").strip()
        if not title:
            # Generate a default name only for *new* graphs
            title = f"Attack Graph {AttackGraph.objects.count() + 1}"

        g = AttackGraph.objects.create(
            id=data.get("id"),
            title=title,
            arrival=data.get("arrival", {}),
            metadata=data.get("metadata", {}),
        )

        nodes = data.get("nodes", [])
        edges = data.get("edges", [])
        if nodes:
            Node.objects.bulk_create([Node(graph=g, **n) for n in nodes])
        if edges:
            Edge.objects.bulk_create([Edge(graph=g, **e) for e in edges])

        return g

    def update(self, inst, data):
        # Only overwrite title if the new one is non-empty *and different*
        new_title = (data.get("title") or "").strip()
        if new_title and new_title != inst.title:
            inst.title = new_title

        inst.arrival = data.get("arrival", inst.arrival)
        inst.metadata = data.get("metadata", inst.metadata)
        inst.save()

        # Only replace nodes/edges if actually sent
        nodes = data.get("nodes")
        edges = data.get("edges")

        if nodes is not None:
            inst.nodes.all().delete()
            Node.objects.bulk_create([Node(graph=inst, **n) for n in nodes])

        if edges is not None:
            inst.edges.all().delete()
            Edge.objects.bulk_create([Edge(graph=inst, **e) for e in edges])

        return inst

    def get_latest_result(self, obj):
        r = obj.results.order_by("-created_at").first()
        return AttackGraphResultSerializer(r).data if r else None


class AttackGraphResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttackGraphResult
        fields = ["id","created_at","method","samples","mean","p10","p50","p90","seed"]


class ScenarioSerializer(serializers.ModelSerializer):
    attack_graphs = AttackGraphSerializer(many=True, read_only=True)
    attack_graph_ids = serializers.PrimaryKeyRelatedField(
        queryset=AttackGraph.objects.all(),
        many=True,
        write_only=True,
        required=False,
        source="attack_graphs",
    )

    class Meta:
        model = Scenario
        fields = [
            "id",
            "title",
            "description",
            "attack_graphs",
            "primary_attack_graph",
            "attack_graph_ids",
            "tef_min", "tef_ml", "tef_max",
            "vuln_min", "vuln_ml", "vuln_max",
            "vuln_source",
            # New loss decomposition fields
            "plm_min", "plm_ml", "plm_max",
            "slef_min", "slef_ml", "slef_max",
            "slm_min", "slm_ml", "slm_max",

            # Derived outputs
            "lef_estimate",
            "lm_estimate",
            "ale_estimate",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["lef_estimate", "lm_estimate", "ale_estimate", "created_at", "updated_at"]

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        #instance.compute_derived_values()
        instance.save()
        return instance


