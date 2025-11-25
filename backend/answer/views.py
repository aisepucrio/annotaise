from rest_framework import viewsets
from .models import Answer
from item.models import ItemMembership
from .serializers import AnswerSerializer
from rest_framework.response import Response

class AnswerViewset(viewsets.ModelViewSet):
    http_method_names = ['get', 'post', 'patch', 'delete']
    serializer_class = AnswerSerializer

    def get_queryset(self):
        # Answers que pertencem a rótulações onde o usuário é membro
        return (
            Answer.objects
            .filter(labeling__memberships__user=self.request.user)
            .distinct()
        )

    def create(self, request, *args, **kwargs):
        user = request.user
        item_id = request.data.get('item')

        data = request.data
        # Garante que o usuário tenha membership nesse item
        membership = ItemMembership.objects.filter(
            user=user,
            item_id=item_id,
        ).first()

        if not membership:
            return Response(
                {'detail': 'Você não pode responder a esse item da rotulação.'},
                status=403
            )
        

        serializer = self.get_serializer(data=data, context={'request':request})
        serializer.is_valid(raise_exception=True)

        # Cria a Answer (se tiver campo answered_by, labeling etc, você pode setar aqui)
        self.perform_create(serializer)

        # Remove a reserva do item
        membership.delete()

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=201, headers=headers)
    
