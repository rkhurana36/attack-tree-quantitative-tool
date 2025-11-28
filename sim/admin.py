from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from .models import AttackGraph, Scenario

@admin.register(AttackGraph)
class AttackGraphAdmin(admin.ModelAdmin):
    list_display = ("title", "owner", "visibility", "created_at", "open_editor_link")
    search_fields = ("title", "owner__username")
    exclude = ("owner",)

    def save_model(self, request, obj, form, change):
        if not obj.owner_id:
            obj.owner = request.user
        super().save_model(request, obj, form, change)

    def open_editor_link(self, obj):
        url = reverse("sim:graph_editor", args=[obj.id])
        return format_html('<a class="button" href="{}" target="_blank">Open Editor</a>', url)

    open_editor_link.short_description = "Editor"

@admin.register(Scenario)
class ScenarioAdmin(admin.ModelAdmin):
    list_display = ("title", "owner", "ale_estimate", "lef_estimate", "updated_at", "open_editor_link")
    exclude = ("owner",)
    filter_horizontal = ("attack_graphs",)
    readonly_fields = ("lef_estimate", "ale_estimate")

    def save_model(self, request, obj, form, change):
        if not getattr(obj, "owner_id", None):
            obj.owner = request.user
        obj.compute_derived_values()
        super().save_model(request, obj, form, change)

    def open_editor_link(self, obj):
        url = reverse("sim:scenario_editor", args=[obj.id])
        return format_html('<a class="button" href="{}" target="_blank">Open Editor</a>', url)