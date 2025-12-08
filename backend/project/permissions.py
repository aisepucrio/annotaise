from rest_framework.permissions import BasePermission
from .models import Project, ProjectMembership

    
class IsProjectOwnerPermission(BasePermission):
    """
    Permission: apenas usuários que são 'owner' do projeto
    (via ProjectMembership) podem acessar o objeto.
    Funciona tanto para Project quanto para ProjectMembership.
    """
    message = "Somente proprietários do projeto podem realizar esta ação."

    def has_object_permission(self, request, view, obj):
        user = request.user
        
        project = self._get_project_from_obj(obj)
        if project is None:
            return False

        return project.memberships.filter(user=user, role="owner").exists()

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
