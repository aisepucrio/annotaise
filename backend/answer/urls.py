from .views import (
    AnonymousSubmitAnswerView,
    AnswerViewset,
    AnswersDashboardView,
    ExportAnswersView,
    LabelingBackgroundAnswerView,
    LabelingBackgroundAnswersView,
)

from django.urls import path
from rest_framework.routers import DefaultRouter

urlpatterns = [
    path("answers/anonymous/<uuid:token>/", AnonymousSubmitAnswerView.as_view(), name="answer-submit-anonymous"),
    path("labelings/<int:labeling_id>/answers/", AnswersDashboardView.as_view(), name="answer-list-by-labeling"),
    path("labelings/<int:labeling_id>/answers/export/", ExportAnswersView.as_view(), name="answer-export-by-labeling"),
    path("labelings/<int:labeling_id>/background-answer/", LabelingBackgroundAnswerView.as_view(), name="background-answer-current-user"),
    path("labelings/<int:labeling_id>/background-answers/", LabelingBackgroundAnswersView.as_view(), name="background-answer-list"),
]

router = DefaultRouter()

router.register(r"answers",AnswerViewset,basename="answers")

urlpatterns += router.urls

