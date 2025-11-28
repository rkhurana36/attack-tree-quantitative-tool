from django import template
from django.utils.html import format_html

from attack_tree_project.manifest import vite_asset
from django.conf import settings

register = template.Library()

@register.simple_tag
def vite_files(logical_name: str):
    """
    Emits all needed <script> and <link> tags for a Vite entrypoint.
    """

    if settings.FRONTEND_DEV:
        # Use the dev server
        url = f"{settings.VITE_DEV_SERVER_URL}/{logical_name}"
        return format_html(f"""
            <script type="module" src="{url}"></script>
        """)

    entry = vite_asset(logical_name)
    if entry is None:
        return ""

    tags = []

    # Main JS
    tags.append(f'<script type="module" src="{entry["file"]}"></script>')

    # CSS
    for css in entry["css"]:
        tags.append(f'<link rel="stylesheet" href="{css}">')

    # Imports: resolve to real file paths
    for imp in entry["imports"]:
        imp_entry = vite_asset(imp)
        tags.append(f'<script type="module" src="{imp_entry["file"]}"></script>')
        for css in imp_entry["css"]:
            tags.append(f'<link rel="stylesheet" href="{css}">')

    return format_html("\n".join(tags))
