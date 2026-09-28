"""URL configuration for annotaise project."""
from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView,SpectacularSwaggerView,SpectacularRedocView
from health_check.views import HealthCheckView

urlpatterns = [
    path('admin/', admin.site.urls),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/schema.yaml", SpectacularAPIView.as_view(), name="schema-yaml"),
    path("api/docs/", SpectacularSwaggerView.as_view(), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(), name="redoc"),
    path("", include("authentication.urls")),
    path("api/health/", HealthCheckView.as_view(), name="health_check"),

    path("", include("user.urls")),
    path("", include("project.urls")),
    path("", include("labeling.urls")),
    path("", include("item.urls")),
    path("", include("answer.urls"))
]
