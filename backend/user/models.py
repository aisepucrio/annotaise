from django.db import models
from django.contrib.auth.models import AbstractUser


class CustomUser(AbstractUser):
    '''a pk do usuario é o email. o username é um id aleatorio.'''

    class AccountType(models.TextChoices):
        STANDARD = "standard", "Padrao"
        EDITOR = "editor", "Editor"
        ADMIN = "admin", "Administrador"

    email = models.EmailField(unique=True, null=False, blank=False)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    account_type = models.CharField(
        max_length=50,
        blank=True,
        choices=AccountType.choices,
        default=AccountType.STANDARD,
    )

    def save(self, *args, **kwargs):
        if self.is_superuser:
            self.account_type = self.AccountType.ADMIN
        return super().save(*args, **kwargs)

    def can_edit(self):
        return self.account_type in {
            self.AccountType.EDITOR,
            self.AccountType.ADMIN,
        }

    def __str__(self):
        return f"{self.first_name} {self.last_name}"
