from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.response import Response
from labeling.models import Labeling, LabelingMembership
import pandas as pd
from .serializers import UploadItemCSVSerializer, ItemSerializer, NextItemResponseSerializer
from drf_spectacular.utils import extend_schema, OpenApiResponse
from rest_framework.parsers import MultiPartParser
from .models import Item, ItemMembership
from answer.models import Answer
from django.db.models import Count, F, Value
from django.db.models.functions import Coalesce
from django.db import transaction
from django.utils import timezone
from datetime import timedelta


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

    parser_classes = (MultiPartParser,)
    @extend_schema(
        request=UploadItemCSVSerializer,
        responses={
            200: OpenApiResponse(description="Arquivo CSV recebido com sucesso"),
            400: OpenApiResponse(description="Erro na validação ou no arquivo enviado"),
        },
    )
    def post(self, request, labeling_id):
        
        serializer = UploadItemCSVSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        labeling = get_object_or_404(Labeling, id=labeling_id)

        uploaded_file = serializer.validated_data['file']

        if uploaded_file is None:
            return Response({"detail": "Nenhum arquivo enviado"}, status=400)

        if not getattr(uploaded_file, "name", "").lower().endswith(".csv"):
            return Response({"detail": "O arquivo deve ser .csv"}, status=400)
        
        df = pd.read_csv(uploaded_file)
        
        cols = df.columns
        print(cols)


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

    def get_next_item_for_user(self, labeling, user):
        """
        Retorna o próximo item para o usuário, seguindo a ordem:
        1) Item já em membership do usuário (incompleto)
        2) Novo item livre e elegível
        3) Item de outra pessoa com membership expirado (rouba)
        """

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
            return membership.item

        # 2) Pega um novo item elegível (sem membership prévio do user)
        item = (
            Item.objects
            .select_for_update(skip_locked=True)
            .filter(labeling=labeling, status='pending')
            .annotate(
                num_answers=Count('answers'),
                required_answers=Coalesce('labeling__users_per_item', Value(1)),
            )
            .filter(num_answers__lt=F('required_answers'))  # ainda tem "vagas"
            .exclude(answers__answered_by=user)                     # user ainda não respondeu
            .exclude(memberships__user=user)                        # sem membership prévio
            .first()
        )

        if item:
            ItemMembership.objects.create(item=item, user=user)
            return item

        # 3) Rouba membership expirada de outra pessoa
        STALE_MINUTES = 10  # define a janela de expiração que fizer sentido pra você
        stale_limit = timezone.now() - timedelta(minutes=STALE_MINUTES)

        expired_membership = (
            ItemMembership.objects
            .select_for_update(skip_locked=True)
            .select_related('item', 'item__labeling')
            .annotate(
                num_answers=Count('item__answers'),
                required_answers=Coalesce('item__labeling__users_per_item', Value(1)),
            )
            .filter(
                item__labeling=labeling,
                item__status='pending',
                created_at__lt=stale_limit,  # membership velho
                num_answers__lt=F('required_answers'),  # ainda cabe mais gente
            )
            .exclude(user=user)                             # não rouba de si mesmo
            .exclude(item__answers__answered_by=user)       # user ainda não respondeu o item
            .order_by('created_at')                         # o mais antigo primeiro
            .first()
        )

        if expired_membership:
            item = expired_membership.item
            # remove o lock antigo
            expired_membership.delete()
            # cria o lock pro usuário atual
            ItemMembership.objects.create(item=item, user=user)
            return item

        # Nenhum item elegível
        return None

    @transaction.atomic
    def retrieve(self, request, *args, **kwargs):
        labeling = get_object_or_404(Labeling, id=kwargs['labeling_id'])
        user = request.user

        item = self.get_next_item_for_user(labeling, user)
        if not item:
            return Response({'detail': 'Você não tem rotulações para responder.'}, status=404)

        return self.serialize_and_return(item)
