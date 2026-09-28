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
        How much of each group's quota is still left on this item.

        Returns: dict[group_name, remaining_count], only entries > 0. The key
        'any' is the residual slot (fillable by any respondent); answers with
        responded_as=None count towards 'any'.

        Each Answer is counted exactly once, by the group recorded in
        responded_as — no double counting when the respondent belongs to
        multiple groups of the same labeling.

        In decision mode with a tiebreak in progress (configured quotas
        already filled but no single winner yet), keeps an 'any' slot open so
        new respondents can unblock the vote.

        One query per item. To evaluate several items, prefer the class
        method remaining_groups_for (a single aggregated query).
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
        remaining_groups for several items of the SAME labeling, with a single
        aggregated query — instead of one per item.

        `items`: iterable of already-loaded Item objects (we use each one's
        id, status, and decision_payload, without new queries).
        Returns: {item_id: {group_name: remaining}}.
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
        Core of the quota calculation, shared by the single-item path
        (remaining_groups) and the batch one (remaining_groups_for).

        `counts`: {group_name: recorded_answers}, already with 'any' aggregating
        null responded_as values. `labeling`: avoids accessing self.labeling
        (and the query that could trigger) when the caller already has it.
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
        Eligibility predicate over an already-computed remaining_groups dict:
        there's an open 'any' slot, or one of the user's groups still has
        quota left. Used both in distribution and in the dashboard.
        """
        if not remaining:
            return False
        if 'any' in remaining:
            return True
        return not user_group_names.isdisjoint(remaining.keys())

    def _decision_has_winner(self):
        """True if decision_payload already indicates a single leader among the votes."""
        payload = self.decision_payload or {}
        if not payload:
            return False
        counts = sorted(payload.values(), reverse=True)
        runner_up = counts[1] if len(counts) > 1 else 0
        return counts[0] > runner_up

    def pick_responded_as_for(self, user):
        """
        Chooses which UserGroup an answer from this user should fill.

        Strategy: among the user's groups that still have quota on this item,
        pick the one with the largest deficit. If the user belongs to no
        group with quota left, returns None — the answer falls into the
        residual 'any' slot.
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
    # Renewed (via save) every time the user re-fetches the item in next-item.
    # Reservation expiry (stealing) uses this field, not created_at — created_at
    # is auto_now_add and never changes after creation.
    last_seen_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['item', 'user'],
                name='unique_membership_per_user_per_item',
            )
        ]
