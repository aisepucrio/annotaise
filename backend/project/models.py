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

