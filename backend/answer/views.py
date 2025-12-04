from rest_framework import viewsets
from .models import Answer
from item.models import ItemMembership
from .serializers import AnswerSerializer
from rest_framework.response import Response
from item.models import Item
from rest_framework.exceptions import PermissionDenied

class AnswerViewset(viewsets.ModelViewSet):
    http_method_names = ['get', 'post', 'patch', 'delete']
    serializer_class = AnswerSerializer

    def get_queryset(self):
        user = self.request.user
        qs = (
            Answer.objects
            .select_related("item", "labeling")
            .filter(labeling__memberships__user=user)
            .distinct()
        )

        labeling_id = self.request.query_params.get("labeling")
        if labeling_id and labeling_id.isdigit():
            qs = qs.filter(labeling_id=int(labeling_id))

        if getattr(user, "is_staff", False):
            return qs

        # usuários comuns só veem (e editam) as próprias respostas
        return qs.filter(answered_by=user)

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

        obj = Item.objects.select_related('labeling').get(id=item_id)
        
        # Cria a Answer (se tiver campo answered_by, labeling etc, você pode setar aqui)
        self.perform_create(serializer)

        if obj.labeling.users_per_item <= Answer.objects.filter(item__id=item_id).count():
            obj.status = 'finished'
            obj.save()

        # Remove a reserva do item
        membership.delete()

        headers = self.get_success_headers(serializer.data)

        return Response(serializer.data, status=201, headers=headers)

    def _assert_owner_or_admin(self, answer):
        user = self.request.user
        if getattr(user, "is_staff", False):
            return
        if getattr(answer.labeling, "block_section_back", False):
            raise PermissionDenied("Edições estão bloqueadas para esta rotulação.")
        if answer.answered_by_id != user.id:
            raise PermissionDenied("Você não pode editar esta resposta.")

    def update(self, request, *args, **kwargs):
        answer = self.get_object()
        self._assert_owner_or_admin(answer)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        answer = self.get_object()
        self._assert_owner_or_admin(answer)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        answer = self.get_object()
        self._assert_owner_or_admin(answer)
        return super().destroy(request, *args, **kwargs)
    
