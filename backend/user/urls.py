from rest_framework.routers import DefaultRouter
from .views import CurrentAPIView
from rest_framework_simplejwt.views import TokenObtainPairView
from django.urls import path
from .views import AdminUserViewSet,InvitationViewSet

urlpatterns = [
    path("users/current/", CurrentAPIView.as_view(), name="current_user"),
]
router = DefaultRouter()
router.register(r"users", AdminUserViewSet, basename="admin-users")
router.register(r"invitations", InvitationViewSet, basename="invitations")

urlpatterns += router.urls
