from django.db import models
from django.db.models.functions import Coalesce


class ItemQuerySet(models.QuerySet):
    def answerable_by(self, labeling, user):
        """Items of `labeling` this user could still answer, by its distribution
        strategy — the read behind both distribution and dependency unlocking.

        Reservations are ignored: an item another user merely holds still counts,
        because that reservation expires and gets stolen. Group quotas are not
        applied here; they need `Item.remaining_groups_for` in Python.
        """
        from answer.models import Answer

        items = self.filter(labeling=labeling).exclude(answers__answered_by=user)
        if labeling.form_mode:
            return items

        items = items.filter(status="pending")
        if labeling.distribution_strategy == labeling.DistributionStrategy.PER_PERSON:
            return items.annotate(item_user_id=models.F("payload__user_id")).filter(
                item_user_id=user.id
            )
        if labeling.decision:
            # Decision mode keeps offering full items: a tiebreak needs new voters.
            return items

        # Capacity as a scalar subquery, not an aggregate: stays a WHERE.
        answered = (
            Answer.objects
            .filter(item=models.OuterRef("pk"))
            .values("item")
            .annotate(total=models.Count("id"))
            .values("total")
        )
        return items.alias(answered=Coalesce(models.Subquery(answered), 0)).filter(
            answered__lt=labeling.users_per_item
        )
