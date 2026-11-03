from rest_framework.permissions import BasePermission

from item.models import ItemMembership
from labeling.permissions import can_annotate_labeling


class CanAnswerLabelingPermission(BasePermission):
    """
    Quem pode registrar resposta numa rotulação.

    Só define has_permission: no POST não existe objeto ainda, e o DRF nunca
    chama has_object_permission em create — a checagem que ficava lá não rodava.
    """
    message = "Você não pode responder essa rotulação."

    def has_permission(self, request, view):
        return can_annotate_labeling(request.user, request.data.get("labeling"))


class HasItemReservationPermission(BasePermission):
    """Só responde o item quem recebeu a reserva dele (ItemMembership)."""
    message = "Você não pode responder a esse item da rotulação."

    def has_permission(self, request, view):
        item_id = str(request.data.get("item") or "")
        if not item_id.isdigit():
            return False
        return ItemMembership.objects.filter(user=request.user, item_id=item_id).exists()
