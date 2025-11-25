from rest_framework.routers import DefaultRouter
from .views import AnswerViewset

urlpatterns = [
    
]

router = DefaultRouter()

router.register(r"answers",AnswerViewset,basename="answers")

urlpatterns += router.urls


