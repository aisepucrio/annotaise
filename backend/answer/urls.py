from rest_framework.routers import DefaultRouter
from .views import AnswerViewset

urlpatterns = [
    
]

router = DefaultRouter()

router.register(r"answer",AnswerViewset,basename="answer")

urlpatterns += router.urls


