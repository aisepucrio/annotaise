from rest_framework.permissions import BasePermission
from .models import Labeling, LabelingMembership, DependsOn
from project.models import ProjectMembership

# labeling_membership roles that grant edit rights on the labeling.
EDIT_ROLES = [LabelingMembership.Role.OWNER, LabelingMembership.Role.ADMIN]


# 'viewer' is read-only: it stays out, here and on the annotator dashboard.
ANNOTATE_ROLES = [
    LabelingMembership.Role.OWNER,
    LabelingMembership.Role.ADMIN,
    LabelingMembership.Role.ANNOTATOR,
]


def can_edit_labeling(user, labeling_id, roles=EDIT_ROLES):
    """Edit rights come from the labeling membership, not the project one."""
    if not labeling_id or not getattr(user, "is_authenticated", False):
        return False
    try:
        labeling_id = int(labeling_id)
    except (TypeError, ValueError):
        return False
    return LabelingMembership.objects.filter(
        user=user, labeling_id=labeling_id, role__in=roles
    ).exists()


def can_annotate_labeling(user, labeling_id):
    """Who can annotate: any labeling member except viewers."""
    return can_edit_labeling(user, labeling_id, ANNOTATE_ROLES)


def can_create_labeling_in_project(user, project_id):
    """
    Creation still depends on the project: the labeling (and its membership)
    doesn't exist yet at POST time.
    """
    if not project_id or not getattr(user, "is_authenticated", False):
        return False
    return ProjectMembership.objects.filter(
        user=user, role__in=['contributor', 'owner'], project__id=project_id
    ).exists()


class CanEditLabelingPermission(BasePermission):
    """
    Handles both views with `labeling_id` in the URL (checked in has_permission)
    and viewsets that resolve the object (checked in has_object_permission).
    """
    message = "Você não tem permissão para editar essa rotulação."
    roles = EDIT_ROLES

    def has_permission(self, request, view):
        labeling_id = view.kwargs.get('labeling_id') or self._labeling_from_payload(request)
        if labeling_id is None:
            # No labeling in the URL nor in the payload: has_object_permission decides instead.
            return True
        return can_edit_labeling(request.user, labeling_id, self.roles)

    def _labeling_from_payload(self, request):
        """The labeling a write names in its body.

        On create there is no object yet, so has_object_permission never runs
        and the URL carries no labeling: without this, any admin account could
        write a row pointing at a labeling they don't belong to.
        """
        if request.method not in ('POST', 'PUT', 'PATCH'):
            return None
        return (request.data or {}).get('labeling') or None

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

        if isinstance(obj, (LabelingMembership, DependsOn)):
            # DependsOn: rights come from the dependent labeling, the one the edge changes.
            return obj.labeling
        return None


class IsLabelingOwnerPermission(CanEditLabelingPermission):
    """Deleting the labeling is owner-only."""
    message = "Apenas o dono da rotulação pode excluí-la."
    roles = [LabelingMembership.Role.OWNER]


class CanManageDependencyPermission(CanEditLabelingPermission):
    """Both ends must be editable, matching the dependency picker.

    The parent authorizes the dependent labeling; only a create names a
    prerequisite, so reads and deletes fall through untouched.
    """

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        prerequisite_id = request.data.get('depends_on')
        return prerequisite_id is None or can_edit_labeling(request.user, prerequisite_id)
