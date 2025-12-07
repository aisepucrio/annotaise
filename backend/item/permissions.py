from rest_framework.permissions import BasePermission
from project.models import Project, ProjectMembership

class CanEditProjectPermission(BasePermission):
    """
permissão do usuário para editar rotulações nesse projeto em especifico."""
    def has_permission(self, request, view):
        
        labeling_id = view.kwargs.get('labeling_id')
        user = request.user
        can_edit = ProjectMembership.objects.filter(
            project__labelings__id=labeling_id,
            user=user,
            role__in=['owner', 'contributor']
        ).exists()

        return can_edit
