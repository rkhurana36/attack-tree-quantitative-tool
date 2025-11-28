# sim/api_urls.py
from rest_framework.routers import DefaultRouter
from .views import AttackGraphViewSet, ScenarioViewSet

router = DefaultRouter()
router.register(r'graphs', AttackGraphViewSet, basename='graphs')
router.register(r'scenarios', ScenarioViewSet, basename='scenarios')

urlpatterns = router.urls