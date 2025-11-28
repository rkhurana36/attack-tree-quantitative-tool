import json
import os
from django.conf import settings

_manifest_cache = None

def vite_asset(logical_name: str):
    """
    Returns a dict:
      { "file": "...js", "css": ["..css", ...], "imports": ["..js", ...] }

    Dev mode: returns None
    """
    global _manifest_cache

    if settings.FRONTEND_DEV:
        return None

    if _manifest_cache is None:
        manifest_path = os.path.join(
            settings.BASE_DIR, "frontend", "dist", ".vite", "manifest.json"
        )
        with open(manifest_path, "r") as f:
            _manifest_cache = json.load(f)

    for key, val in _manifest_cache.items():
        if key.endswith(logical_name):
            return {
                "file": "/static/" + val["file"],
                "css": ["/static/" + c for c in val.get("css", [])],
                "imports": val.get("imports", []),   # these refer to other manifest keys
            }

    raise RuntimeError(f"Asset {logical_name} not found in manifest")
