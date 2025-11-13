from .views import LabelingViewSet
from rest_framework.routers import DefaultRouter
from .views import ProjectMembershipViewSet

urlpatterns = []

router = DefaultRouter()

router.register(r"labelings", LabelingViewSet, basename="labelings")
router.register(r"labeling-memberships", ProjectMembershipViewSet, basename="labeling-memberships")

urlpatterns += router.urls

