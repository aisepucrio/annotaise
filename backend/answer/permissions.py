from item.models import ItemMembership
from rest_framework.permissions import BasePermission

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

class HasItemMembership(BasePermission):
    """
    O usuário precisa ter uma reserva (ItemMembership) do item que quer responder.

    Guarda a reserva em request.item_membership: a view precisa do objeto para
    liberá-la depois de gravar a resposta.
    """
    message = "Você não pode responder a esse item da rotulação."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        item_id = request.data.get("item")
        if not str(item_id).isdigit():
            return False

        membership = ItemMembership.objects.filter(
            user=request.user,
            item_id=int(item_id),
        ).first()
        if membership is None:
            return False

        request.item_membership = membership
        return True


