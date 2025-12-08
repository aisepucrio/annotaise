from .models import Answer
from item.models import ItemMembership, Item
from .serializers import AnswerSerializer, AnswerDashboardSerializer
from labeling.models import LabelingElement
from labeling.models import Labeling

from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from rest_framework.views import APIView
from user.permissions import IsAdminAccount
from django.http import HttpResponse

import pandas as pd

from rest_framework.generics import ListAPIView
from django.db.models import Q

class AnswerViewset(viewsets.ModelViewSet):
    http_method_names = ['get', 'post', 'patch', 'delete']
    serializer_class = AnswerSerializer

    def get_queryset(self):
        user = getattr(self.request, "user", None)

        if not user or not getattr(user, "is_authenticated", False):
            return Answer.objects.none()

        qs = (
            Answer.objects
            .select_related("item", "labeling")
            .distinct()
        )

        labeling_id = self.request.query_params.get("labeling")
        if labeling_id and labeling_id.isdigit():
            qs = qs.filter(labeling_id=int(labeling_id))

        if (
            getattr(user, "is_staff", False)
            or getattr(user, "is_superuser", False)
            or getattr(user, "account_type", "") == "admin"
        ):
            return qs

        # usuários comuns só veem (e editam) as próprias respostas
        return qs.filter(
            Q(labeling__memberships__user=user) |
            Q(answered_by=user)
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


class AnswersDashboardView(ListAPIView):
    serializer_class = AnswerSerializer

    def get_queryset(self):
        labeling_id = self.kwargs.get("labeling_id")
        return Answer.objects.filter(labeling_id=labeling_id)


class ExportAnswersView(APIView):
    permission_classes = [IsAdminAccount]

    def get(self, request, **kwargs):
        labeling_id = kwargs.get("labeling_id")
        labeling = Labeling.objects.get(id=labeling_id)
        answers = Answer.objects.filter(labeling_id=labeling_id).select_related("item")
        questions_qs = LabelingElement.objects.filter(labeling_section__labeling_id=labeling_id).exclude(question_type="context").values('id','text')

        questions = {int(q["id"]): q["text"] for q in questions_qs}
        rows = []
        for answer in answers:
            payload = answer.answer_payload
            item_payload = answer.item.payload
            row = {}
            print(payload)
            for question_number, response in payload.items():
                row["context_id"] = answer.item.id
                row["user_id"] = answer.answered_by

                q_id = int(question_number)
                col_name = "Q : " + questions.get(q_id)

                if col_name is None:
                    continue

                if isinstance(response, list):
                    row[col_name] = ", ".join(str(x) for x in response)
                else:
                    row[col_name] = response
            for k, v in item_payload.items():
                row["C : " + k] = v

            rows.append(row)
        df = pd.DataFrame(rows)

        # Gera o conteúdo do CSV como *string*, sem salvar em arquivo
        csv_data = df.to_csv(index=False)

        response = HttpResponse(csv_data, content_type="text/csv")
        response["Content-Disposition"] = (
            f'attachment; filename="exported_answers_{labeling.title}.csv"'
        )
        return response
