from rest_framework.permissions import BasePermission

class CanEditProjectPermission(BasePermission):
    """
    Permission to check if a user can edit a project.
    Only admin users or project members with edit rights can edit.
    """
    message="Você não tem permissão para editar este projeto."
    def has_object_permission(self, request, view, obj):
        user = request.user

        membership = obj.memberships.filter(user=user,role__in=['contributor','owner'] ).first()
        if membership:
            return True

        return False
    
class IsProjectOwnerPermission(BasePermission):
    """
    Permission to check if a user is the owner of a project.
    Only admin users or project owners can perform certain actions.
    """
    message="Somente proprietários do projeto podem realizar esta ação."
    def has_object_permission(self, request, view, obj):
        user = request.user

        membership = obj.memberships.filter(user=user,role='owner' ).first()
        if membership:
            return True

        return False