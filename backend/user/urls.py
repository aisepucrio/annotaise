from rest_framework.routers import DefaultRouter
from .views import CurrentAPIView
from rest_framework_simplejwt.views import TokenObtainPairView
from django.urls import path
from .views import AdminUserViewSet

urlpatterns = [
    path("current/", CurrentAPIView.as_view(), name="current_user"),
]
router = DefaultRouter()
router.register(r"", AdminUserViewSet, basename="admin-users")

urlpatterns += router.urls