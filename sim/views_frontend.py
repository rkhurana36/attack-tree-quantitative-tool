# sim/views_frontend.py
from django.shortcuts import render, get_object_or_404
from .models import AttackGraph, Scenario
from django.contrib.auth.decorators import login_required
from django.conf import settings
from django.middleware.csrf import get_token

@login_required
def graph_editor(request, graph_id):
    graph = get_object_or_404(AttackGraph, id=graph_id)
    return render(request, "sim/editor.html", {
        "graph_id": graph.id,
        "graph_title": graph.title,
        "IS_DEV": settings.IS_DEV,
        "csrf_token": get_token(request),
    })

@login_required
def scenario_editor(request, scenario_id):
    scenario = get_object_or_404(Scenario, id=scenario_id, owner=request.user)
    return render(request, "sim/scenario_editor.html", {"scenario": scenario})