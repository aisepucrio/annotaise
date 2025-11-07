from django.db import models
from django.conf import settings

class Answer(models.Model):
    item = models.ForeignKey("item.Item", on_delete=models.CASCADE, related_name="answers")
    labeling = models.ForeignKey("labeling.Labeling", on_delete=models.CASCADE, related_name="answers")
    labeling_question = models.ForeignKey("labeling.LabelingElement", on_delete=models.CASCADE, related_name="answers")
    answered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.DO_NOTHING, related_name="answers_given"
    )
    answer_payload = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Questão respondida por {self.answered_by} para {self.item.id} da rotulação {self.labeling.title}"
