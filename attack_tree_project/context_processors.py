from django.conf import settings
from .manifest import vite_asset

def vite(request):
    return {
        "FRONTEND_DEV": settings.FRONTEND_DEV,
        "vite_asset": vite_asset
    }
