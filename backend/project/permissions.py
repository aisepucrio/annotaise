from rest_framework.permissions import BasePermission
from .models import Project, ProjectMembership

    
class IsProjectOwnerPermission(BasePermission):
    message = "Somente proprietários do projeto podem realizar esta ação."

    def has_permission(self, request, view):

        if view.action in ["create","list"]:
            project_id = request.data.get("project")
            
            return ProjectMembership.objects.filter(
                project_id=project_id,
                user=request.user,
                role=ProjectMembership.RoleChoices.OWNER,
            ).exists()
        return True 

    def has_object_permission(self, request, view, obj):
        project = self._get_project_from_obj(obj)
        if project is None:
            return False
        return project.memberships.filter(user=request.user, role="owner").exists()

    def _get_project_from_obj(self, obj):
        """
        Normaliza o objeto para sempre obter um Project.
        - Se obj já for Project, retorna ele.
        - Se obj for ProjectMembership, retorna obj.project.
        - Se não der pra resolver, retorna None.
        """
        if isinstance(obj, Project):
            return obj

        if isinstance(obj, ProjectMembership):
            return obj.project

        return None
