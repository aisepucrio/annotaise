from django.db import models

class Item(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pendente"
        LABELED = "labeled", "Rotulado"
        SKIPPED = "skipped", "Ignorado"
    labeling = models.ForeignKey("labeling.Labeling", on_delete=models.CASCADE, related_name="items")
    payload = models.JSONField()
    row_index = models.PositiveIntegerField()
    status = models.CharField(max_length=50, default="pending")

    def __str__(self):
        return self.name
    
