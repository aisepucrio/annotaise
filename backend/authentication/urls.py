from django.urls import path
from .views import PublicCustomTokenObtainPairView, PublicTokenRefreshView
from authentication.views import RegisterAPIView


urlpatterns = [
    path("token/", PublicCustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", PublicTokenRefreshView.as_view(), name="token_refresh"),
    path("register/", RegisterAPIView.as_view(), name="register"),
]


