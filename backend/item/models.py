from django.db import models
from django.contrib.auth import get_user_model


User = get_user_model()
class Item(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pendente"
        LABELED = "labeled", "Rotulado"
        SKIPPED = "skipped", "Ignorado"
    labeling = models.ForeignKey("labeling.Labeling", on_delete=models.CASCADE, related_name="items",null=False,blank=False,db_index=True)
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, related_name="assignments", null=True, blank=True)
    assignment_date = models.DateField(null=True, blank=True)
    payload = models.JSONField()
    row_index = models.PositiveIntegerField()
    status = models.CharField(max_length=50, default="pending")

    decision_payload = models.JSONField(null=True,blank=True)
    llm_tiebreak_attempted = models.BooleanField(default=False)
    llm_tiebreak_result = models.JSONField(null=True, blank=True)
    final_decision_source = models.CharField(max_length=16, null=True, blank=True)
    final_decision_value = models.CharField(max_length=300, null=True, blank=True)

    def __str__(self):
        return self.name
    
class ItemMembership(models.Model):
    item = models.ForeignKey('Item', on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='item_memberships')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['item', 'user'],
                name='unique_membership_per_user_per_item',
            )
        ]
