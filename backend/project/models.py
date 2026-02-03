from django.db import models
from django.conf import settings
from django.utils import timezone

class Project(models.Model):
    class status(models.TextChoices):
        PLANNING = "planning", "Planejamento"
        ACTIVE = "active", "Ativo"
        COMPLETED = "completed", "Concluído"
        CANCELLED = "cancelled", "Cancelado"


    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=50, choices=status.choices, default=status.PLANNING)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.DO_NOTHING, related_name="projects_created"
    )
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at", "name"]

    def __str__(self):
        return self.name


class ProjectMembership(models.Model):
    class RoleChoices(models.TextChoices):
        OWNER = "owner", "Proprietário"
        CONTRIBUTOR = "contributor", "Colaborador"
        VIEWER = "viewer", "Visualizador"

    role = models.CharField(max_length=50, choices=RoleChoices.choices, default=RoleChoices.VIEWER)
    project = models.ForeignKey("Project", on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="project_memberships"
    )
    joined_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ("project", "user")
        ordering = ["-joined_at"]
        indexes = [
            # Índice composto para encontrar memberships por usuário e item
            models.Index(fields=['project', 'user'], name='membership_project_user_idx'),
        ]

    def __str__(self):
        return f"{self.user} in {self.project}"
