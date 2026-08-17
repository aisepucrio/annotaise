from django.db import models
from django.conf import settings

from .querysets import AnswerQuerySet

class Answer(models.Model):
    '''a arquitetura escolhida foi 1 questao pra cada item. o payload consiste no id da questao : resposta'''
    item = models.ForeignKey("item.Item", on_delete=models.CASCADE, related_name="answers")
    labeling = models.ForeignKey("labeling.Labeling", on_delete=models.CASCADE, related_name="answers")
    answered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, related_name="answers_given", null=True
    )
    # Grupo que essa resposta preenche na cota da rotulação. null = preenche o slot
    # residual "any". Define-se na criação para evitar dupla contagem quando o
    # respondente pertence a múltiplos grupos relevantes para a mesma rotulação.
    responded_as = models.ForeignKey(
        "user.UserGroup",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="answers_filling_quota",
    )
    answer_payload = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    objects = AnswerQuerySet.as_manager()

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            # Índice composto para verificar se usuário já respondeu um item
            models.Index(fields=['answered_by', 'item'], name='answer_user_item_idx'),
        ]

    def __str__(self):
        return f"Questão respondida por {self.answered_by} para {self.item.id} da rotulação {self.labeling.title}"


class BackgroundAnswer(models.Model):
    labeling = models.ForeignKey(
        "labeling.Labeling",
        on_delete=models.CASCADE,
        related_name="background_answers",
    )
    answered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="background_answers_given",
        null=True
    )
    answer_payload = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["labeling", "answered_by"],
                name="unique_background_answer_per_user",
            ),
        ]
        indexes = [
            models.Index(
                fields=["labeling", "answered_by"],
                name="bg_answer_lbl_user_idx",
            ),
        ]

    def __str__(self):
        return (
            f"Background respondido por {self.answered_by} "
            f"na rotulação {self.labeling.title}"
        )
