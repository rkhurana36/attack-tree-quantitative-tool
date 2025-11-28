from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from two_factor.urls import urlpatterns as tf_urls

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("sim.api_urls")),  # REST API
    path("sim/", include("sim.urls")),      # Django-rendered pages
    path("account/", include(tf_urls)),
]

# Serve static files **before** we add catch-all routes
if not settings.DEBUG:
    print("WE ARE NOT IN A DEBUG SERVER")
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# Two-factor routes MUST BE LAST — they catch everything
#urlpatterns += [
    #path("", include(tf_urls)),
#]#
