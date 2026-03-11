from django.db import models
from django.contrib.auth.models import AbstractUser
import uuid
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

class CustomUser(AbstractUser):
    '''a pk do usuario é o email. o username é um id aleatorio.'''

    class AccountType(models.TextChoices):
        STANDARD = "standard", "Padrao"
        EDITOR = "editor", "Editor"
        ADMIN = "admin", "Administrador"

    class OnboardingStatus(models.TextChoices):
        PENDING = "pending", "Pendente"
        ACTIVE = "active", "Ativo"

    email = models.EmailField(unique=True, null=False, blank=False)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    account_type = models.CharField(
        max_length=50,
        blank=True,
        choices=AccountType.choices,
        default=AccountType.STANDARD,
    )
    onboarding_status = models.CharField(
        max_length=32,
        choices=OnboardingStatus.choices,
        default=OnboardingStatus.ACTIVE,
    )

    def save(self, *args, **kwargs):
        if self.is_superuser:
            self.account_type = self.AccountType.ADMIN
            self.onboarding_status = self.OnboardingStatus.ACTIVE
        return super().save(*args, **kwargs)

    @property
    def can_edit(self):
        return self.account_type in {
            self.AccountType.EDITOR,
            self.AccountType.ADMIN,
        }

    def __str__(self):
        full_name = f"{self.first_name} {self.last_name}".strip()
        return full_name or self.email

class Invitation(models.Model):
    email = models.EmailField()
    role = models.CharField(max_length=50,choices=CustomUser.AccountType.choices)

    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, primary_key=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sent_invitations",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="received_invitations",
    )

    def save(self, *args, **kwargs):
        if not self.expires_at:
            #convite válido por 7 dias
            self.expires_at = timezone.now() + timedelta(days=7)
        super().save(*args, **kwargs)

    @property
    def is_expired(self) -> bool:
        return timezone.now() > self.expires_at
    
class UserGroup(models.Model):
    name = models.CharField(max_length=100)
    created_by = models.ForeignKey(CustomUser,on_delete=models.SET_NULL,null=True)

class GroupMembership(models.Model):
    group = models.ForeignKey(UserGroup,on_delete=models.CASCADE,related_name="memberships")
    user = models.ForeignKey(CustomUser,on_delete=models.CASCADE,related_name="memberships")

    joined_at = models.DateTimeField(default=timezone.now)
