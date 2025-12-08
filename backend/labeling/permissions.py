from rest_framework.permissions import BasePermission
from .models import Labeling, LabelingMembership
from project.models import ProjectMembership

class CanEditLabelingsInProjectPermission(BasePermission):
    """
    Permission to check if a user can edit a project.
    Only admin users or project members with edit rights can edit.
    """
    message="Você não tem permissão para editar rotulações desse projeto."
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        #TODO
        labeling = self._get_labeling_from_obj(obj)
        if not labeling:
            return False

        membership = labeling.project.memberships.filter(user=user,role__in=['contributor','owner']).first()
        if membership:
            return True

        return False

    def can_edit_labeling(self, user, labeling_id):
        """
        Checa permissão recebendo o ID ou objeto de labeling.
        """
        membership = ProjectMembership.objects.filter(user=user,role__in=['contributor','owner'],project__labelings__id=labeling_id).first()
        if membership:
            return True
        else :
            return False
    
    def can_edit_labeling_by_project(self, user, project_id):
        """
        Checa permissão recebendo o ID do projeto
        """
        membership = ProjectMembership.objects.filter(user=user,role__in=['contributor','owner'],project__id=project_id).first()
        if membership:
            return True
        else :
            return False

    
    def _get_labeling_from_obj(self, obj):
        if isinstance(obj, Labeling):
            return obj

        if isinstance(obj, LabelingMembership):
            return obj.labeling
        return None
