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


class IsLabelingOwnerPermission(BasePermission):

    message = "Somente o dono do projeto pode gerenciar a configuração de IA desta rotulação."

    def has_object_permission(self, request, view, obj):
        labeling = obj if isinstance(obj, Labeling) else getattr(obj, "labeling", None)
        if not labeling:
            return False
        return labeling.project.memberships.filter(user=request.user, role="owner").exists()


class IsAICredentialOwnerPermission(BasePermission):
    """A biblioteca de chaves é privada: cada um só mexe nas próprias.

    Vale para ler, editar e remover. Uma rotulação pode até estar apontando
    para a credencial de outro admin (o lab compartilha contas), mas quem não
    é dono não consegue trocar a chave nem descobrir mais do que o key_hint.
    """

    message = "Você só pode gerenciar as credenciais de IA que você mesmo cadastrou."

    def has_object_permission(self, request, view, obj):
        return obj.owner_id == request.user.id
