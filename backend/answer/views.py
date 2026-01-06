from .models import Answer
from item.models import ItemMembership, Item
from .serializers import AnswerSerializer, AnswerDashboardSerializer
from labeling.models import LabelingElement
from labeling.models import Labeling

from django.shortcuts import get_object_or_404
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from rest_framework.views import APIView
from user.permissions import IsAdminAccount
from django.http import HttpResponse
from .permissions import CanAnswerLabelingPermission

import pandas as pd

from rest_framework.generics import ListAPIView
from django.db.models import Q
from rest_framework.permissions import IsAuthenticated
#TODO aqui é melhor usar permission pra ver se o item membership existe!
class AnswerViewset(viewsets.ModelViewSet):
    http_method_names = ['get', 'post', 'patch', 'delete']
    serializer_class = AnswerSerializer
    permission_classes = [IsAdminAccount]

    def get_permissions(self):

        if self.action in ['create']:
            perm = [CanAnswerLabelingPermission()]
        else:
            perm = [IsAdminAccount()]
        return perm
        
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

        return qs

    def create(self, request, *args, **kwargs):
        user = request.user
        data = request.data

        item_id = data.get('item')
        item = get_object_or_404(Item,pk=item_id)

        # Garante que o usuário tenha membership nesse item TODO isso era pra trr na permission... T-T
        membership = ItemMembership.objects.filter(
            user=user,
            item_id=item_id,
        ).first()

        if not membership:
            return Response(
                {'detail': 'Você não pode responder a esse item da rotulação.'},
                status=403
        )
        # TODO eu acho que esse finished era pra tar no enum... 
        if item.status == 'finished':
            return Response(
                {'detail': 'Esse item já foi finalizado e não pode mais receber respostas.'},
                status=403
        )
        
        serializer = self.get_serializer(data=data, context={'request':request})
        serializer.is_valid(raise_exception=True)
        
        labeling = item.labeling
    
        self.perform_create(serializer)

        # Remove a reserva do item
        membership.delete()

        if labeling.decision == True:

            #caso a validação seja por decisão, verifica se ja atingiu o numero necessario de respostas para finalizar a rotulação
            payload = data.answer_payload

            decisive_ids = LabelingElement.objects.filter(labeling=labeling,decisive_question=True).first().id
            decision_dict = getattr(item.decision_payload,{})
            '''a ideia e primeiro adicionar tudo no dicionario e depois checar se ja terminou (todas as questoes alvo ja tem decisao)'''

            answer = str(payload[decisive_ids])

            if not decision_dict.get(answer,None):
                decision_dict[answer] = 1
            else:
                decision_dict[answer] += 1

            item.decision_payload = decision_dict
            item.save()

            if labeling.users_per_item <= Answer.objects.filter(item__id=item_id).count():
                #agora checando se terminou (isso futuramente pode ser uma função)
                for question_id, answer_dict in decision_dict.items():
                    done = False
                    biggest = 0
                    biggest_answer = None
                    for answer, number_of_appearences in answer_dict.items():
                        if number_of_appearences > biggest:
                            biggest = number_of_appearences
                            biggest_answer = answer
                            done = True
                        elif number_of_appearences == biggest:
                            done = False # empate, decisao nao tomada ainda
                    if done == True:
                        #decisao tomada
                        item.status = 'finished'
                        item.save()
                    else: # se alguma decisao nao ta feita, envia denovo...
                        break
            
            return Response(serializer.data, status=201)

        else:

            obj = Item.objects.select_related('labeling').get(id=item_id)
            

            if obj.labeling.users_per_item <= Answer.objects.filter(item__id=item_id).count():
                obj.status = 'finished'
                obj.save()

            headers = self.get_success_headers(serializer.data)

        if not labeling.items.filter(~Q(status='finished')).exists():
            labeling.status = 'finished'
            labeling.save()

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
        answers = (
            Answer.objects.filter(labeling_id=labeling_id)
            .select_related("item")
            .order_by("item__row_index", "id")
        )
        questions_qs = LabelingElement.objects.filter(labeling_section__labeling_id=labeling_id).exclude(question_type="context").values('id','text')

        questions = {int(q["id"]): q["text"] for q in questions_qs}
        rows = []
        for answer in answers:
            payload = answer.answer_payload
            item_payload = answer.item.payload
            row = {}
            for question_number, response in payload.items():
                row["context_id"] = (answer.item.row_index or 0) + 1
                row["user_id"] = answer.answered_by

                q_id = int(question_number)
                question_text = questions.get(q_id)
                if not question_text:
                    # pula perguntas que não estão mais na estrutura ou não tem label
                    continue
                col_name = "Q : " + question_text

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
