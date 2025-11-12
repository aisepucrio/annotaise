from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import ProjectViewSet, ProjectMembershipViewSet

urlpatterns = []
router = DefaultRouter()
router.register(r"projects", ProjectViewSet, basename="projects")
router.register(r"project-memberships", ProjectMembershipViewSet, basename="project-memberships")

urlpatterns += router.urls