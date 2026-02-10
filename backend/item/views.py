from .models import Item, ItemMembership
from .serializers import UploadItemCSVSerializer, ItemSerializer, NextItemResponseSerializer
from labeling.models import Labeling, LabelingMembership, LabelingSection
from answer.models import Answer, BackgroundAnswer
from user.permissions import IsAdminAccount
from .permissions import CanEditProjectPermission

from datetime import timedelta
import pandas as pd

from rest_framework.views import APIView
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiResponse
from django.shortcuts import get_object_or_404
from django.db.models import Count, Exists, F, OuterRef, Value
from django.db.models.functions import Coalesce
from django.db import transaction
from django.utils import timezone


class ListItemsView(ListAPIView):
    serializer_class = ItemSerializer

    def get_queryset(self):
        labeling_id = self.kwargs.get("labeling_id")
        return Item.objects.filter(labeling_id=labeling_id).distinct()

    def list(self, request, *args, **kwargs):
        labeling_id = kwargs.get("labeling_id")

        if not LabelingMembership.objects.filter(
            labeling_id=labeling_id,
            user=request.user
        ).exists():
            return Response(
                {"detail": "Você não tem acesso a essa rotulação"},
                status=401
            )
        return super().list(request, *args, **kwargs)


class ImportItemsCsvView(APIView):
    permission_classes = [IsAdminAccount, CanEditProjectPermission]
    parser_classes = (MultiPartParser,)
    @extend_schema(
        request=UploadItemCSVSerializer,
        responses={
            200: OpenApiResponse(description="Arquivo CSV recebido com sucesso"),
            400: OpenApiResponse(description="Erro na validação ou no arquivo enviado"),
        },
    )
    def put(self, request, labeling_id):
        #não sei se vai funcionar sem deletar todas as sections junto

        items = Item.objects.filter(labeling_id=labeling_id)

        if items.exists():
            items.delete()

        serializer = UploadItemCSVSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        labeling = get_object_or_404(Labeling, id=labeling_id)

        uploaded_file = serializer.validated_data['file']

        if uploaded_file is None:
            return Response({"detail": "Nenhum arquivo enviado"}, status=400)

        if not getattr(uploaded_file, "name", "").lower().endswith(".csv"):
            return Response({"detail": "O arquivo deve ser .csv"}, status=400)
        
        df = pd.read_csv(uploaded_file)
        df.fillna("Valor Nulo", inplace=True)

        cols = df.columns

        labeling.column_names = list(cols)
        labeling.save()

        items = []

        for idx, row in df.iterrows():
            items.append(
                Item(
                    labeling=labeling,
                    row_index=idx,
                    payload=row.to_dict(),
                    status="pending",
                )
            )

        Item.objects.bulk_create(items)
        
        return Response({"detail": "Arquivo recebido"}, status=200)
    

class NextItemView(RetrieveAPIView):
    serializer_class = NextItemResponseSerializer

    def serialize_and_return(self, item):
        serializer = self.get_serializer(item)
        return Response(serializer.data, status=200)

    def ensure_membership(self, item, user):
        membership = (
            ItemMembership.objects
            .select_for_update()
            .filter(item=item, user=user)
            .first()
        )
        if membership:
            return membership
        return ItemMembership.objects.create(item=item, user=user)

    def get_next_item_for_user(self, labeling, user):
        """
        Retorna o próximo item para o usuário, seguindo a ordem:
        1) Item já em membership do usuário (incompleto)
        2) Novo item livre e elegível
        3) Item de outra pessoa com membership expirado (rouba)
        """
        if labeling.status == "finished":
            return Response(
                {"detail": "Essa rotulação já foi finalizada", "code": "ROTULACAO_FINALIZADA"},
                status=400,
            )


        # 1) Já tem membership ativo?
        membership = (
            ItemMembership.objects
            .select_for_update()  # lock na linha do membership
            .select_related('item')
            .filter(
                user=user,
                item__labeling=labeling,
                item__status='pending',
            )
            .first()
        )
        if membership:
            membership.created_at = timezone.now() # TODO esse atributo tem um nome bem enganoso... melhor updated at
            return membership.item
        

        if labeling.decision == True:
            item = (
                Item.objects
                .filter(labeling=labeling, status='pending')
                .exclude(answers__answered_by=user)
                .annotate(answer_count=Count('answers'),
                    membership_count=Count('memberships'),
                    total_count=F('answer_count') + F('membership_count'),
                )
                .order_by('-answer_count') # terminar os que ja tao sendo feitos primeiro
                .first()
                )
            total_count = getattr(item, "total_count", None)
            if item is not None:
                item = (
                    Item.objects
                    .select_for_update(skip_locked=True)
                    .filter(pk=item.pk)
                    .first()
                )
            if item is None :return None

            if total_count > labeling.users_per_item:
                # se for maior é porque só pode ter um item membership e ele deve ser roubado
                
                STALE_MINUTES = 1
                stale_limit = timezone.now() - timedelta(minutes=STALE_MINUTES)

                membership = item.memberships.first()

                if membership:
                    item = membership.item
                    # remove o lock antigo
                    membership.delete()
                    # cria o lock pro usuário atual
                    self.ensure_membership(item, user)
                    return item
                else:
                    
                    ItemMembership.objects.create(item=item, user=user)
                    return item

            else:
                self.ensure_membership(item, user)

                return item

        else:

            # 2) Pega um novo item elegível (sem membership associado)
            item_id = (
                Item.objects
                .filter(labeling=labeling, status='pending')
                .exclude(answers__answered_by=user)
                .annotate(answer_count=Count('answers'),
                    membership_count=Count('memberships'),
                    total_count=F('answer_count') + F('membership_count'),
                )
                .filter(total_count__lt=labeling.users_per_item)
                .order_by('-answer_count') # terminar os que ja tao sendo feitos primeiro
                .first()
                )
            
            if item_id is not None:
                item_id = item_id.id
                item = Item.objects.filter(id=item_id).select_for_update(skip_locked=True).first()

                if item:
                    self.ensure_membership(item, user)
                    return item

            # 3) Rouba membership expirada de outra pessoa
            STALE_MINUTES = 1
            stale_limit = timezone.now() - timedelta(minutes=STALE_MINUTES)

            membership = (
                ItemMembership.objects
                .select_for_update(skip_locked=True)
                .select_related('item', 'item__labeling')
                .filter(
                    item__labeling=labeling,
                    item__status='pending',
                    created_at__lt=stale_limit,  # membership velho
                )
                .exclude(user=user)                             # não rouba de si mesmo
                .exclude(item__answers__answered_by=user)
                .order_by('created_at')                         # o mais antigo primeiro
                .first()
            )

            if membership:
                item = membership.item
                item = Item.objects.select_for_update().filter(pk=item.pk).first()
                if not item:
                    return None
                # remove o lock antigo
                membership.delete()
                # cria o lock pro usuário atual
                self.ensure_membership(item, user)
                return item

        # Nenhum item elegível
        return None

    @transaction.atomic
    def retrieve(self, request, *args, **kwargs):
        labeling = get_object_or_404(Labeling, id=kwargs['labeling_id'])
        user = request.user

        if not LabelingSection.objects.filter(
            labeling=labeling,
            form_type=LabelingSection.FormType.MAIN,
        ).exists():
            return Response({'detail':'o formulário dessa rotulação está vazio','code':'EMPTY_FORM'},status=403)

        if not LabelingMembership.objects.filter(labeling=labeling,user=user).exists():
            return Response('Você não faz parte dessa rotulação',status=403)

        if labeling.has_background_form and not BackgroundAnswer.objects.filter(
            labeling=labeling,
            answered_by=user,
        ).exists():
            return Response(
                {
                    'detail': 'Você precisa responder o formulário background antes de rotular.',
                    'code': 'BACKGROUND_REQUIRED',
                },
                status=403,
            )

        item = self.get_next_item_for_user(labeling, user)
        if isinstance(item, Response):
            return item
        if not item:
            return Response({'detail': 'Você não tem mais rotulações para responder.','code':'NO_LABELINGS_TO_ANSWER'}, status=400)

        return self.serialize_and_return(item)
    
