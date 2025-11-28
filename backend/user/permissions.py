from rest_framework.permissions import BasePermission


class IsAdminAccount(BasePermission):
    """
    Permite acesso apenas a usuários staff ou com account_type = 'admin'.
    """

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        account_type = getattr(user, "account_type", None)
        return account_type == "admin"
    
class CanEditAccount(BasePermission):
    """
    Permite acesso apenas para contas que possam realizar edição/ gerenciamento de projetos/ usuários.
    """

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        account_type = getattr(user, "account_type", None)
        return account_type == "admin" or account_type == "editor"
