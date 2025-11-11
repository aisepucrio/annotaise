from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend


class EmailBackend(ModelBackend):
    """Autentica exclusivamente via email."""

    def authenticate(self, request, username=None, password=None, **kwargs):
        UserModel = get_user_model()

        email = kwargs.get("email") or username
        if not email or password is None:
            return None

        try:
            user = UserModel.objects.get(email__iexact=email)
        except UserModel.DoesNotExist:
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user

        return None
