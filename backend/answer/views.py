from rest_framework import viewsets
from .models import Answer
from .serializers import AnswerSerializer

class AnswerViewset(viewsets.ModelViewSet):
    http_method_names = ['get', 'post', 'patch', 'delete']
    serializer_class = AnswerSerializer

    def get_queryset(self):
        queryset = Answer.objects.filter(labeling__memberships__user=self.request.user)
    