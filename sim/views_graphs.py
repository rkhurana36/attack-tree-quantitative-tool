from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from .models import AttackGraph



@login_required
def graph_list(request):
    graphs = AttackGraph.objects.filter(owner=request.user)
    return render(request, "sim/graph_list.html", {"graphs": graphs})

@login_required
def graph_create(request):
    if request.method == "POST":
        title = request.POST.get("title")
        desc = request.POST.get("description", "")
        g = AttackGraph.objects.create(title=title, description=desc, owner=request.user)
        return redirect("graph_editor", graph_id=g.id)
    return render(request, "sim/graph_create.html")

