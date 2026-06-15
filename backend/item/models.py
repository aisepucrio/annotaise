from django.db import models
from django.db.models import Count
from django.contrib.auth import get_user_model
from user.models import UserGroup


User = get_user_model()
class Item(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pendente"
        LABELED = "labeled", "Rotulado"
        SKIPPED = "skipped", "Ignorado"
    labeling = models.ForeignKey("labeling.Labeling", on_delete=models.CASCADE, related_name="items",null=False,blank=False,db_index=True)
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, related_name="assignments", null=True, blank=True)
    assignment_date = models.DateField(null=True, blank=True)
    payload = models.JSONField()
    row_index = models.PositiveIntegerField()
    status = models.CharField(max_length=50, default="pending")

    decision_payload = models.JSONField(null=True,blank=True)
    llm_tiebreak_attempted = models.BooleanField(default=False)
    llm_tiebreak_result = models.JSONField(null=True, blank=True)
    final_decision_source = models.CharField(max_length=16, null=True, blank=True)
    final_decision_value = models.CharField(max_length=300, null=True, blank=True)

    def remaining_groups(self):
        """
        Quanto ainda falta de cada grupo na cota da rotulação para este item.

        Retorno: dict[group_name, remaining_count], só com entradas > 0. A chave
        'any' é o slot residual (preenchível por qualquer respondente);
        respostas com responded_as=None contam para 'any'.

        Cada Answer é contada exatamente uma vez, pelo grupo registrado em
        responded_as — sem dupla contagem quando o respondente pertence a
        múltiplos grupos da mesma rotulação.

        Em decision mode com desempate em andamento (cotas configuradas já
        preenchidas mas ainda sem vencedor único), mantém um slot 'any' aberto
        para que novos respondentes possam destravar a votação.

        Uma query por item. Para avaliar vários itens, prefira o método de
        classe remaining_groups_for (uma única query agregada).
        """
        answered = (
            self.answers
            .values('responded_as__name')
            .annotate(count=Count('id'))
        )
        counts = {(row['responded_as__name'] or 'any'): row['count'] for row in answered}
        return self._remaining_from_counts(counts)

    @classmethod
    def remaining_groups_for(cls, labeling, items):
        """
        remaining_groups para vários itens da MESMA rotulação, com uma única
        query agregada — em vez de uma por item.

        `items`: iterável de Item já carregados (usamos id, status e
        decision_payload de cada um, sem novas queries).
        Retorno: {item_id: {group_name: remaining}}.
        """
        from answer.models import Answer

        items = list(items)
        if not items:
            return {}

        item_ids = [it.id for it in items]
        rows = (
            Answer.objects
            .filter(item_id__in=item_ids)
            .values('item_id', 'responded_as__name')
            .annotate(count=Count('id'))
        )
        counts_by_item = {}
        for row in rows:
            group_name = row['responded_as__name'] or 'any'
            counts_by_item.setdefault(row['item_id'], {})[group_name] = row['count']

        return {
            it.id: it._remaining_from_counts(counts_by_item.get(it.id, {}), labeling)
            for it in items
        }

    def _remaining_from_counts(self, counts, labeling=None):
        """
        Núcleo do cálculo de cotas, compartilhado pelo caminho de item único
        (remaining_groups) e pelo lote (remaining_groups_for).

        `counts`: {group_name: respostas_registradas} já com 'any' agregando os
        responded_as nulos. `labeling`: evita acessar self.labeling (e a query
        que isso pode disparar) quando o chamador já o tem em mãos.
        """
        labeling = labeling or self.labeling
        quotas = dict(labeling.items_per_group or {})
        if not quotas:
            return {}

        for group_name, count in counts.items():
            if group_name in quotas:
                quotas[group_name] -= count

        if (
            labeling.decision
            and self.status != 'finished'
            and all(v <= 0 for v in quotas.values())
            and not self._decision_has_winner()
        ):
            quotas['any'] = max(quotas.get('any', 0), 0) + 1

        return {name: remaining for name, remaining in quotas.items() if remaining > 0}

    @staticmethod
    def _slot_open(remaining, user_group_names):
        """
        Predicado de elegibilidade sobre um dict de remaining_groups já
        calculado: há slot 'any' em aberto, ou algum grupo do usuário ainda tem
        cota. Usado tanto na distribuição quanto no dashboard.
        """
        if not remaining:
            return False
        if 'any' in remaining:
            return True
        return not user_group_names.isdisjoint(remaining.keys())

    def _decision_has_winner(self):
        """True se decision_payload já indica um líder único entre os votos."""
        payload = self.decision_payload or {}
        if not payload:
            return False
        counts = sorted(payload.values(), reverse=True)
        runner_up = counts[1] if len(counts) > 1 else 0
        return counts[0] > runner_up

    def pick_responded_as_for(self, user):
        """
        Escolhe qual UserGroup uma resposta deste usuário deve preencher.

        Estratégia: entre os grupos do usuário que ainda têm cota neste item,
        escolhe o de maior déficit. Se o usuário não pertence a nenhum grupo
        ainda com cota, retorna None — a resposta cai no slot residual 'any'.
        """
        remaining = self.remaining_groups()
        if not remaining:
            return None

        candidates = list(
            UserGroup.objects
            .filter(memberships__user=user, name__in=remaining.keys())
            .distinct()
        )
        if not candidates:
            return None

        return max(candidates, key=lambda g: remaining[g.name])

    def __str__(self):
        return f"Item {self.id} da rotulação '{self.labeling.title}' (status: {self.get_status_display()})"
    
class ItemMembership(models.Model):
    item = models.ForeignKey('Item', on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='item_memberships')
    created_at = models.DateTimeField(auto_now_add=True)
    # Renovado (via save) toda vez que o usuário rebusca o item no next-item.
    # A expiração de reservas (roubo) usa este campo, não created_at — created_at
    # é auto_now_add e nunca muda após a criação.
    last_seen_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['item', 'user'],
                name='unique_membership_per_user_per_item',
            )
        ]
