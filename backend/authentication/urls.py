from django.urls import path
from .views import PublicCustomTokenObtainPairView, PublicTokenRefreshView, ForgotPasswordView, ResetPasswordView
from authentication.views import RegisterAPIView

urlpatterns = [
    path("api/auth/token/", PublicCustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", PublicTokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/register/", RegisterAPIView.as_view(), name="register"),
    path("api/auth/forgot-password/", ForgotPasswordView.as_view(), name="forgot_password"),
    path("api/auth/reset-password/", ResetPasswordView.as_view(), name="reset_password"),
]


