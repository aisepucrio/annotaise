from rest_framework.permissions import BasePermission
from labeling.models import LabelingMembership


class CanAnswerLabelingPermission(BasePermission):
    """
    Permission to check if a user can answer a labeling.
    """

    def has_object_permission(self, request, view, obj):
        labeling_id = obj.get("labeling_id")
        user = request.user

        if not labeling_id or not user.is_authenticated:
            return False

        try:
            membership = LabelingMembership.objects.get(
                labeling_id=labeling_id,
                user=user,
            )
        except LabelingMembership.DoesNotExist:
            return False

        return membership.can_answer