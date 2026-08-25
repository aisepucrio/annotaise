from .models import Item, ItemMembership
from .serializers import UploadItemCSVSerializer, ItemSerializer, NextItemResponseSerializer
from labeling.models import Labeling, LabelingMembership, LabelingSection
from answer.models import Answer, BackgroundAnswer
from user.models import UserGroup
from user.permissions import IsAdminAccount
from labeling.permissions import CanEditLabelingPermission, can_annotate_labeling

from datetime import timedelta
import csv
import io
import json
import pandas as pd

from rest_framework.views import APIView
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated, AllowAny
from drf_spectacular.utils import extend_schema, OpenApiResponse
from django.shortcuts import get_object_or_404
from django.db.models import Count, Exists, F, OuterRef, Value
from django.db.models.functions import Coalesce
from django.db import transaction
from django.utils import timezone
from django.http import HttpResponse
from django.utils.text import slugify



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
    permission_classes = [IsAdminAccount, CanEditLabelingPermission]
    parser_classes = (MultiPartParser,)
    @extend_schema(
        request=UploadItemCSVSerializer,
        responses={
            200: OpenApiResponse(description="Arquivo CSV recebido com sucesso"),
            400: OpenApiResponse(description="Erro na validação ou no arquivo enviado"),
        },
    )
    def put(self, request, labeling_id):
        #TODO acho que a ideia do put ja ficou meio pra tras.. talvez seja melhor um POST mesmo pra isso

        items = Item.objects.filter(labeling_id=labeling_id)

        if items.exists():
            items.delete()

        serializer = UploadItemCSVSerializer(data=request.data)
        if not serializer.is_valid():
            labeling = get_object_or_404(Labeling, id=labeling_id)
            labeling.delete()
            return Response(serializer.errors, status=400)

        labeling = get_object_or_404(Labeling, id=labeling_id)


        uploaded_file = serializer.validated_data['file']

        if uploaded_file is None:
            return Response({"detail": "Nenhum arquivo enviado"}, status=400)

        if not getattr(uploaded_file, "name", "").lower().endswith(".csv"):
            return Response({"detail": "O arquivo deve ser .csv"}, status=400)
        
        df = pd.read_csv(uploaded_file, dtype=str)
        df.fillna("Valor Nulo", inplace=True)

        cols = df.columns

        if labeling.distribution_strategy == Labeling.DistributionStrategy.PER_PERSON:
            if "user_id" not in cols:
                labeling.delete()
                return Response({"detail": "Para a estratégia 'Por pessoa', o arquivo CSV deve conter uma coluna 'user_id' com os IDs dos usuários."}, status=400)


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

class AddItemsToExistingLabelingView(APIView):
    permission_classes = [IsAdminAccount, CanEditLabelingPermission]
    parser_classes = (MultiPartParser,)
    @extend_schema(
        request=UploadItemCSVSerializer,
        responses={
            200: OpenApiResponse(description="Itens adicionados a rotulação com sucesso"),
            400: OpenApiResponse(description="Erro na validação ou no arquivo enviado"),
        },
    )
    def post(self, request, labeling_id):

        labeling = get_object_or_404(Labeling, id=labeling_id)

        columns_in_labeling = labeling.column_names if isinstance(labeling.column_names, list) else []

        serializer = UploadItemCSVSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        uploaded_file = serializer.validated_data['file']

        if uploaded_file is None:
            return Response({"detail": "Nenhum arquivo enviado"}, status=400)

        if not getattr(uploaded_file, "name", "").lower().endswith(".csv"):
            return Response({"detail": "O arquivo deve ser .csv"}, status=400)
        
        df = pd.read_csv(uploaded_file, dtype=str)
        #TODO tem que averiguar se a pessoa colocar 2 colunas iguais vai dar problema...
        cols = list(df.columns)
        non_existent_cols = columns_in_labeling.copy()
        for col in cols:
            if col not in columns_in_labeling:
                df.drop(columns=[col], inplace=True)
            else:
                non_existent_cols.remove(col)

        if df.empty:
            return Response({"detail": "Nenhum item válido encontrado no arquivo CSV. Verifique se as colunas correspondem às colunas da rotulação."}, status=400)

        for col in non_existent_cols:
            df[col] = "Valor Nulo"

        df.fillna("Valor Nulo", inplace=True)

        if labeling.distribution_strategy == Labeling.DistributionStrategy.PER_PERSON:
            if "user_id" not in cols:
                return Response({"detail": "Para a estratégia 'Por pessoa', o arquivo CSV deve conter uma coluna 'user_id' com os IDs dos usuários."}, status=400)
            
        existing_count = Item.objects.filter(labeling=labeling).count()
        items = []

        for idx, row in df.iterrows():
            items.append(
                Item(
                    labeling=labeling,
                    row_index=existing_count + idx,
                    payload=row.to_dict(),
                    status="pending",
                )
            )

        Item.objects.bulk_create(items)

        if labeling.status == "finished" and len(items) > 0:
            labeling.status = "in_progress"
            labeling.save()
        
        return Response({"detail": "Itens adicionados a rotulação com sucesso"}, status=200)

class ExportImportedItemsCsvView(APIView):
    permission_classes = [IsAdminAccount, CanEditLabelingPermission]

    @extend_schema(
        responses={
            200: OpenApiResponse(description="CSV original reconstruído com sucesso"),
            400: OpenApiResponse(description="Rotulação sem colunas importadas para exportação"),
        },
    )
    def get(self, request, labeling_id):
        labeling = get_object_or_404(Labeling, id=labeling_id)
        columns = labeling.column_names if isinstance(labeling.column_names, list) else []

        if not columns:
            return Response(
                {
                    "detail": "Esta rotulação não possui colunas importadas para exportação.",
                    "code": "IMPORTED_CSV_UNAVAILABLE",
                },
                status=400,
            )

        items = Item.objects.filter(labeling=labeling).order_by("row_index", "id")
        buffer = io.StringIO(newline="")
        writer = csv.writer(buffer)
        writer.writerow(columns)

        for item in items:
            payload = item.payload or {}
            row = []
            for column in columns:
                value = payload.get(column, "")
                if value is None:
                    row.append("")
                elif isinstance(value, (dict, list)):
                    row.append(json.dumps(value, ensure_ascii=False))
                else:
                    row.append(value)
            writer.writerow(row)

        filename_base = slugify(labeling.title) or f"labeling_{labeling.id}"
        response = HttpResponse(
            buffer.getvalue(),
            content_type="text/csv; charset=utf-8",
        )
        response["Content-Disposition"] = (
            f'attachment; filename="{filename_base}_imported.csv"'
        )
        return response
    

class NextItemView(RetrieveAPIView):
    serializer_class = NextItemResponseSerializer

    def serialize_and_return(self, item):
        serializer = self.get_serializer(item)
        return Response(serializer.data, status=200)

    def ensure_membership(self, item, user):
        membership, created = ItemMembership.objects.get_or_create(item=item, user=user)
        if not created:
            # Renova a reserva: last_seen_at é auto_now, um save vazio basta.
            membership.save(update_fields=['last_seen_at'])
        return membership

    def _user_group_names(self, user):
        """Conjunto dos grupos do usuário, computado uma vez por requisição."""
        return set(
            UserGroup.objects
            .filter(memberships__user=user)
            .values_list('name', flat=True)
        )

    def _pick_auto_candidate(self, labeling, user, *, require_capacity, user_group_names):
        """
        Escolhe o melhor item pendente para o usuário na estratégia automática.

        Ordena por mais respondido (para empurrar itens à conclusão), com
        randomização como desempate. `require_capacity=True` exige item ainda
        não cheio (total_count < users_per_item) — usado fora do decision mode.

        Sem cotas por grupo, usa o caminho rápido (.first()). Com cotas por
        grupo nomeado, calcula o remaining de todos os candidatos numa única
        query agregada (Item.remaining_groups_for) e devolve, na ordem, o
        primeiro item onde o usuário ainda consegue preencher um grupo aberto.
        """
        qs = (
            Item.objects
            .filter(labeling=labeling, status='pending')
            .exclude(answers__answered_by=user)
            .annotate(
                answer_count=Count('answers'),
                membership_count=Count('memberships'),
                total_count=F('answer_count') + F('membership_count'),
            )
        )
        if require_capacity:
            qs = qs.filter(total_count__lt=labeling.users_per_item)
        qs = qs.order_by('-answer_count', '?')

        if not labeling.has_group_quotas:
            return qs.first()

        candidates = list(qs)
        remaining_by_item = Item.remaining_groups_for(labeling, candidates)
        for item in candidates:
            if Item._slot_open(remaining_by_item.get(item.id, {}), user_group_names):
                return item
        return None

    def _steal_stale_membership(self, labeling, user, user_group_names):
        """
        Rouba a membership expirada mais antiga de outro usuário (reserva que
        passou do tempo), respeitando cotas por grupo quando configuradas.
        """
        STALE_MINUTES = 10
        stale_limit = timezone.now() - timedelta(minutes=STALE_MINUTES)

        memberships = list(
            ItemMembership.objects
            .select_for_update(skip_locked=True)
            .select_related('item', 'item__labeling')
            .filter(
                item__labeling=labeling,
                item__status='pending',
                last_seen_at__lt=stale_limit,
            )
            .exclude(user=user)
            .exclude(item__answers__answered_by=user)
            .order_by('last_seen_at')  # rouba primeiro a reserva mais abandonada
        )

        remaining_by_item = {}
        if labeling.has_group_quotas:
            remaining_by_item = Item.remaining_groups_for(
                labeling, [m.item for m in memberships]
            )

        for membership in memberships:
            candidate = membership.item
            if labeling.has_group_quotas and not Item._slot_open(
                remaining_by_item.get(candidate.id, {}), user_group_names
            ):
                continue
            item = (
                Item.objects
                .select_for_update()
                .filter(pk=candidate.pk)
                .first()
            )
            if not item:
                continue
            membership.delete()
            self.ensure_membership(item, user)
            return item
        return None

    def _get_item_auto_strategy(self, labeling, user):
        """
        Retorna o próximo item para o usuário, seguindo a ordem:
        1) Item já em membership do usuário (incompleto)
        2) Novo item livre e elegível
        3) Item de outra pessoa com membership expirado (rouba)

        Quando a rotulação tem cotas por grupo (items_per_group com grupos
        nomeados além de 'any'), só são oferecidos itens onde o usuário ainda
        consegue preencher um grupo em aberto — ver Item.remaining_groups_for /
        Item._slot_open.
        """
        # 1) Já tem membership ativo?
        membership = (
            ItemMembership.objects
            .select_for_update()
            .select_related('item')
            .filter(
                user=user,
                item__labeling=labeling,
                item__status='pending',
            )
            .first()
        )
        if membership:
            # Renova a reserva para que ela não seja roubada enquanto o usuário
            # estiver ativo (last_seen_at é auto_now, um save vazio basta).
            membership.save(update_fields=['last_seen_at'])
            return membership.item

        # Grupos do usuário: só precisam ser computados quando há cotas por grupo.
        user_group_names = (
            self._user_group_names(user) if labeling.has_group_quotas else set()
        )

        if labeling.decision == True:
            item = self._pick_auto_candidate(
                labeling, user, require_capacity=False, user_group_names=user_group_names
            )
            if item is None:
                return None

            total_count = item.total_count
            item = (
                Item.objects
                .select_for_update(skip_locked=True)
                .filter(pk=item.pk)
                .first()
            )
            if item is None:
                return None

            # Item já "lotado" (respostas + reservas além de users_per_item):
            # libera uma reserva pendente para que este usuário possa votar
            # (importante para desempates em decision mode).
            if total_count > labeling.users_per_item:
                stale_membership = item.memberships.first()
                if stale_membership:
                    stale_membership.delete()
            self.ensure_membership(item, user)
            return item

        # 2) Pega um novo item elegível (com capacidade)
        item = self._pick_auto_candidate(
            labeling, user, require_capacity=True, user_group_names=user_group_names
        )
        if item is not None:
            item = (
                Item.objects
                .filter(id=item.id)
                .select_for_update(skip_locked=True)
                .first()
            )
            if item:
                self.ensure_membership(item, user)
                return item

        # 3) Rouba membership expirada de outra pessoa
        return self._steal_stale_membership(labeling, user, user_group_names)

    def _get_item_form_mode(self, labeling, user):
        item = (
            Item.objects
            .filter(labeling=labeling)
            .exclude(answers__answered_by=user)
            .order_by('row_index', 'id')
            .first()
        )
        if item:
            self.ensure_membership(item, user)
            return item
        return None

    def _get_item_per_person_strategy(self, labeling, user):
        item = (
            Item.objects
            .annotate(item_user_id=F('payload__user_id'))
            .filter(labeling=labeling, status='pending', item_user_id=user.id)
            .exclude(answers__answered_by=user)
            .order_by('?')
            .first()
        )
        if item:
            self.ensure_membership(item, user)
            return item
        return None

    def get_next_item_for_user(self, labeling, user):

        if labeling.status == "finished":
            return Response(
                {"detail": "Essa rotulação já foi finalizada", "code": "ROTULACAO_FINALIZADA"},
                status=400,
            )

        if labeling.form_mode:
            return self._get_item_form_mode(labeling, user)

        if labeling.distribution_strategy == Labeling.DistributionStrategy.AUTO:
            return self._get_item_auto_strategy(labeling, user)
        elif labeling.distribution_strategy == Labeling.DistributionStrategy.SPECIFIED:
            return Response(
                {"detail": "A estratégia de distribuição 'Estipulada' ainda não é suportada.", "code": "ESTRATEGIA_NAO_SUPORTADA"},
                status=400,
            )
        elif labeling.distribution_strategy == Labeling.DistributionStrategy.PER_PERSON:

            return self._get_item_per_person_strategy(labeling, user)

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

        if not can_annotate_labeling(user, labeling.id):
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


class AnonymousNextItemView(RetrieveAPIView):
    """
    Variante pública/anônima da NextItemView.

    Identifica a rotulação pelo token de modo anônimo presente na URL (em vez
    do labeling_id) e dispensa autenticação e qualquer verificação de
    usuário/membership, já que rotuladores anônimos não possuem conta.
    Retorna a mesma estrutura: as seções do formulário e um item pendente.
    """
    serializer_class = NextItemResponseSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def serialize_and_return(self, item):
        serializer = self.get_serializer(item)
        return Response(serializer.data, status=200)

    @transaction.atomic
    def retrieve(self, request, *args, **kwargs):
        labeling = get_object_or_404(
            Labeling,
            anonymous_token=kwargs['token'],
            distribution_strategy=Labeling.DistributionStrategy.ANONYMOUS_MODE,
        )

        if labeling.status == "finished":
            return Response(
                {"detail": "Essa rotulação já foi finalizada", "code": "ROTULACAO_FINALIZADA"},
                status=400,
            )

        if not LabelingSection.objects.filter(
            labeling=labeling,
            form_type=LabelingSection.FormType.MAIN,
        ).exists():
            return Response({'detail': 'o formulário dessa rotulação está vazio', 'code': 'EMPTY_FORM'}, status=403)

        # Sem usuário para diferenciar, devolvemos simplesmente o próximo item pendente.
        item = (
            Item.objects
            .filter(labeling=labeling, status='pending')
            .order_by('row_index', 'id')
            .first()
        )
        if not item:
            return Response({'detail': 'Não há mais itens para rotular.', 'code': 'NO_LABELINGS_TO_ANSWER'}, status=400)

        return self.serialize_and_return(item)

