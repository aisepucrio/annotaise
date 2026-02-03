from django.db import models
from django.conf import settings

class Answer(models.Model):
    '''a arquitetura escolhida foi 1 questao pra cada item. o payload consiste no id da questao : resposta'''
    item = models.ForeignKey("item.Item", on_delete=models.CASCADE, related_name="answers")
    labeling = models.ForeignKey("labeling.Labeling", on_delete=models.CASCADE, related_name="answers")
    answered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.DO_NOTHING, related_name="answers_given"
    )
    answer_payload = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ["-created_at"]
        indexes = [
            # Índice composto para verificar se usuário já respondeu um item
            models.Index(fields=['answered_by', 'item'], name='answer_user_item_idx'),
        ]

    def __str__(self):
        return f"Questão respondida por {self.answered_by} para {self.item.id} da rotulação {self.labeling.title}"
