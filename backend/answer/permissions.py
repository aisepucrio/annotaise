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
