"""Dependencies between labelings: "this one only opens after you're done with that one".

The edges live in `DependsOn` and form a directed graph that has to stay
acyclic — a cycle would leave every labeling in it permanently blocked. The
check can't live in the model or in a constraint: it reads rows other than the
one being written.

Edges are created and deleted, never moved: changing a prerequisite means
dropping the edge and adding another.

Gating is *per user*, not per campaign: a prerequisite is satisfied once the
user has nothing left to answer in it (queue exhausted, not a member, or the
labeling itself finished). The campaign does not have to be over.
"""

from django.db import IntegrityError, connection, transaction
from rest_framework.exceptions import ValidationError

from ..models import DependsOn, Labeling
from ..permissions import can_annotate_labeling


def _user_can_still_answer(labeling, user):
    """Whether `user` still has something to answer in `labeling`.

    The read itself is `Item.objects.answerable_by`; only the group-quota
    eligibility stays here, since it needs Python (`Item._slot_open`).
    """
    from item.models import Item
    from user.models import UserGroup

    if labeling.status == Labeling.Status.FINISHED:
        return False
    if not can_annotate_labeling(user, labeling.id):
        return False

    items = Item.objects.answerable_by(labeling, user)
    if not labeling.has_group_quotas:
        return items.exists()

    candidates = list(items)
    remaining_by_item = Item.remaining_groups_for(labeling, candidates)
    user_group_names = set(
        UserGroup.objects.filter(memberships__user=user).values_list("name", flat=True)
    )
    return any(
        Item._slot_open(remaining_by_item.get(item.id, {}), user_group_names)
        for item in candidates
    )


def labeling_blocked_for(labeling, user):
    """True when some prerequisite still has work left for this user.

    Anonymous visitors have no identity to exhaust, so they fall back to the
    campaign-wide rule: every prerequisite must be finished.

    ponytail: one query per prerequisite, no caching. The dashboard calls it
    per page (12 rows); if dependency chains or page sizes grow, fold it into
    the queryset.
    """
    if not getattr(user, "is_authenticated", False):
        return labeling.dependencies.unfinished().exists()
    return any(
        _user_can_still_answer(prerequisite, user)
        for prerequisite in Labeling.objects.prerequisites_of(labeling)
    )


def ensure_dependencies_satisfied(labeling, user):
    """Re-read on every assignment/submission: adding a prerequisite or reopening
    one must also block items that were already reserved."""
    if labeling_blocked_for(labeling, user):
        raise ValidationError({
            "detail": "Conclua as rotulações necessárias antes de responder esta rotulação.",
            "code": "UNFINISHED_DEPENDENCIES",
        })


def _lock_graph():
    """Serialize graph edits, including edges with disjoint endpoints.

    Locking only the two endpoints misses concurrent edges joining existing
    paths into a cycle. PostgreSQL's transaction lock covers the whole graph
    without locking annotation rows. SQLite already serializes writes.
    """
    if connection.vendor == "postgresql":
        with connection.cursor() as cursor:
            cursor.execute("SELECT pg_advisory_xact_lock(%s, %s)", [0x414E4E4F, 1])


def _reaches(start_id, target_id):
    """True when `start` reaches `target` by following depends_on edges.

    Breadth-first, one query per level of depth. Dependency chains
    are short; if they ever get deep, swap for a recursive CTE.
    """
    seen = set()
    frontier = [start_id]
    while frontier:
        if target_id in frontier:
            return True
        seen.update(frontier)
        frontier = list(
            DependsOn.objects
            .filter(labeling_id__in=frontier)
            .exclude(depends_on_id__in=seen)
            .values_list("depends_on_id", flat=True)
            .distinct()
        )
    return False


@transaction.atomic
def create_dependency(labeling, depends_on):
    """Record that `labeling` only opens once `depends_on` is done for the user.

    The new edge points from `labeling` to `depends_on`, so it closes a cycle
    exactly when `depends_on` already reaches `labeling`. The lock has to cover
    both the walk and the insert: otherwise two edges that are each fine against
    the old graph commit into a cycle. Self-reference and duplicates are rejected
    by the database; both surface here as a 400 with a `code`, so the view stays
    free of domain rules.
    """
    _lock_graph()
    if _reaches(depends_on.pk, labeling.pk):
        raise ValidationError({
            "detail": "Essa dependência criaria um ciclo entre rotulações.",
            "code": "CIRCULAR_DEPENDENCY",
        })

    try:
        return DependsOn.objects.create(labeling=labeling, depends_on=depends_on)
    except IntegrityError:
        raise ValidationError({
            "detail": "Essa dependência já existe ou aponta para a própria rotulação.",
            "code": "INVALID_DEPENDENCY",
        })
