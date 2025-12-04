from .views import AnswerViewset, AnswersDashboardView, ExportAnswersView

from django.urls import path
from rest_framework.routers import DefaultRouter

urlpatterns = [
    path("labelings/<int:labeling_id>/answers/", AnswersDashboardView.as_view(), name="answer-list-by-labeling"),
    path("labelings/<int:labeling_id>/answers/export/", ExportAnswersView.as_view(), name="answer-export-by-labeling"),
]

router = DefaultRouter()

router.register(r"answers",AnswerViewset,basename="answers")

urlpatterns += router.urls


