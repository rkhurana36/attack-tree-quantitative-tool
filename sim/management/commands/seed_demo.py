import uuid
from django.core.management.base import BaseCommand
from sim.models import AttackGraph, Node, Edge

class Command(BaseCommand):
    help = "Seed the database with a demo attack graph"

    def handle(self, *args, **options):
        # wipe old demo if any
        AttackGraph.objects.filter(title="Phish→Endpoint→Server").delete()

        gid = uuid.uuid4()
        g = AttackGraph.objects.create(
            id=gid,
            title="Phish→Endpoint→Server",
            arrival={"dist": "PERT", "min": 0.5, "mode": 1.0, "max": 2.0},
            metadata={
                "attacker_capability": {"dist": "BETA", "alpha": 2.5, "beta": 2.0},
                "controls": {
                    "email": {"dist": "BETA", "alpha": 4, "beta": 2},
                    "edr":   {"dist": "BETA", "alpha": 3, "beta": 3},
                    "waf":   {"dist": "BETA", "alpha": 3, "beta": 2}
                },
                "loss": {"dist": "LOGNORMAL", "mu": 12.0, "sigma": 1.1, "unit": "USD"},
            },
        )

        Node.objects.bulk_create([
            Node(graph=g, node_id="n1", label="Phishing", kind="attack technique",
                 p_succ={"dist":"PERT","min":0.05,"mode":0.15,"max":0.35},
                 p_detect={"dist":"FIXED","value":0.05},
                 controls=["email"], weights={"k":6}),
            Node(graph=g, node_id="n2", label="Initial Access", kind="attack technique",
                 p_succ={"dist":"PERT","min":0.4,"mode":0.6,"max":0.8}),
            Node(graph=g, node_id="n3", label="Lateral Movement", kind="attack technique",
                 p_succ={"dist":"PERT","min":0.2,"mode":0.4,"max":0.7},
                 controls=["edr"]),
            Node(graph=g, node_id="n4", label="WAF Evasion + Exfil", kind="attack technique",
                 p_succ={"dist":"PERT","min":0.05,"mode":0.2,"max":0.5},
                 controls=["waf"]),
        ])

        Edge.objects.bulk_create([
            Edge(graph=g, edge_id="e1", source="n1", target="n2", type="follows"),
            Edge(graph=g, edge_id="e2", source="n2", target="n3", type="follows"),
            Edge(graph=g, edge_id="e3", source="n3", target="n4", type="follows"),
        ])

        self.stdout.write(self.style.SUCCESS(f"Seeded demo graph with ID: {gid}"))
        #ef040d2a-8e6e-4dfe-9415-52ae51397c6e