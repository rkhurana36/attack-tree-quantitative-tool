# sim/urls.py
from django.urls import path
from . import views_graphs, views_frontend

app_name = "sim"

urlpatterns = [
    path("graphs/", views_graphs.graph_list, name="graph_list"),
    path("graphs/new/", views_graphs.graph_create, name="graph_create"),
    path("editor/<uuid:graph_id>/", views_frontend.graph_editor, name="graph_editor"),
    path("scenario/<uuid:scenario_id>/", views_frontend.scenario_editor, name="scenario_editor"),
]