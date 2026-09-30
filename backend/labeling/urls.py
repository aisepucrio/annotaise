from .views import LabelingViewSet
from rest_framework.routers import DefaultRouter
from .views import LabelingMembershipViewSet, CreateReadLabelingStructureView, AICredentialViewSet
from django.urls import path

urlpatterns = [path('labelings/<int:labeling_id>/structure',CreateReadLabelingStructureView.as_view(),name='labeling-structure')]

router = DefaultRouter()

router.register(r"labelings", LabelingViewSet, basename="labelings")
router.register(r"labeling-memberships", LabelingMembershipViewSet, basename="labeling-memberships")
# Biblioteca de chaves de IA do usuário logado (o viewset filtra por dono).
router.register(r"ai-credentials", AICredentialViewSet, basename="ai-credentials")


urlpatterns += router.urls

