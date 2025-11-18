from .views import LabelingViewSet
from rest_framework.routers import DefaultRouter
from .views import ProjectMembershipViewSet, CreateReadLabelingStructureView
from django.urls import path

urlpatterns = [path('labelings/<int:labeling_id>/structure',CreateReadLabelingStructureView.as_view(),name='labeling-structure')]

router = DefaultRouter()

router.register(r"labelings", LabelingViewSet, basename="labelings")
router.register(r"labeling-memberships", ProjectMembershipViewSet, basename="labeling-memberships")

urlpatterns += router.urls

