from rest_framework.permissions import BasePermission


class IsAdminAccount(BasePermission):
    """
    Permite acesso apenas para contas marcadas como admin ou staff.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if getattr(user, "is_staff", False):
            return True
        account_type = getattr(user, "account_type", None)
        return account_type == getattr(getattr(user, "accountType", None), "ADMIN", "admin") or account_type == "admin"
