from django.db import models
from django.conf import settings

from .querysets import AnswerQuerySet

class Answer(models.Model):
    '''Architecture: one answer per item; the payload maps question id to response.'''
    item = models.ForeignKey("item.Item", on_delete=models.CASCADE, related_name="answers")
    labeling = models.ForeignKey("labeling.Labeling", on_delete=models.CASCADE, related_name="answers")
    answered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, related_name="answers_given", null=True
    )
    # Group this answer fills in the labeling's quota. null = fills the residual
    # "any" slot. Set at creation time to avoid double counting when the
    # respondent belongs to multiple groups relevant to the same labeling.
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
            # Composite index for checking whether a user has already answered an item.
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
