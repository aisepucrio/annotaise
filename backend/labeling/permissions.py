from rest_framework.permissions import BasePermission
from .models import Labeling, LabelingMembership

class CanEditLabelingsInProjectPermission(BasePermission):
    """
    Permission to check if a user can edit a project.
    Only admin users or project members with edit rights can edit.
    """
    message="Você não tem permissão para editar Rotulações projeto."
    def has_object_permission(self, request, view, obj):
        user = request.user
        #TODO

        membership = obj.project.memberships.filter(user=user,role__in=['contributor','owner']).first()
        if membership:
            return True

        return False
    
    def _get_project_from_obj(self, obj):
        if isinstance(obj, Labeling):
            return obj

        if isinstance(obj, LabelingMembership):
            return obj.project

        return None