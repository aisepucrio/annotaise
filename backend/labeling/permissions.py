from rest_framework.permissions import BasePermission
from .models import Labeling, LabelingMembership
from project.models import ProjectMembership

# Papéis do labeling_membership que dão direito de editar a rotulação.
EDIT_ROLES = [LabelingMembership.Role.OWNER, LabelingMembership.Role.ADMIN]


ANNOTATE_ROLES = [
    LabelingMembership.Role.OWNER,
    LabelingMembership.Role.ADMIN,
    LabelingMembership.Role.VIEWER,
    LabelingMembership.Role.ANNOTATOR,
]


def can_edit_labeling(user, labeling_id, roles=EDIT_ROLES):
    """Direito de edição vem do membership da rotulação, não do projeto."""
    if not labeling_id or not getattr(user, "is_authenticated", False):
        return False
    return LabelingMembership.objects.filter(
        user=user, labeling_id=labeling_id, role__in=roles
    ).exists()


def can_annotate_labeling(user, labeling_id):
    """Quem pode responder: membro da rotulação em qualquer papel menos viewer."""
    return can_edit_labeling(user, labeling_id, ANNOTATE_ROLES)


def can_create_labeling_in_project(user, project_id):
    """
    Criação ainda depende do projeto: a rotulação (e o membership dela) ainda
    não existe no momento do POST.
    """
    if not project_id or not getattr(user, "is_authenticated", False):
        return False
    return ProjectMembership.objects.filter(
        user=user, role__in=['contributor', 'owner'], project__id=project_id
    ).exists()


class CanEditLabelingPermission(BasePermission):
    """
    Serve tanto views com `labeling_id` na URL (checagem em has_permission)
    quanto viewsets que resolvem o objeto (checagem em has_object_permission).
    """
    message = "Você não tem permissão para editar essa rotulação."
    roles = EDIT_ROLES

    def has_permission(self, request, view):
        labeling_id = view.kwargs.get('labeling_id')
        if labeling_id is None:
            # Sem labeling na URL: quem decide é has_object_permission.
            return True
        return can_edit_labeling(request.user, labeling_id, self.roles)

    def has_object_permission(self, request, view, obj):
        labeling = self._get_labeling_from_obj(obj)
        if not labeling:
            return False
        return can_edit_labeling(request.user, labeling.id, self.roles)

    def can_edit_labeling(self, user, labeling_id):
        return can_edit_labeling(user, labeling_id)

    def can_edit_labeling_by_project(self, user, project_id):
        return can_create_labeling_in_project(user, project_id)

    def _get_labeling_from_obj(self, obj):
        if isinstance(obj, Labeling):
            return obj

        if isinstance(obj, LabelingMembership):
            return obj.labeling
        return None


class IsLabelingOwnerPermission(CanEditLabelingPermission):
    """Exclusão da rotulação é exclusiva do dono."""
    message = "Apenas o dono da rotulação pode excluí-la."
    roles = [LabelingMembership.Role.OWNER]
