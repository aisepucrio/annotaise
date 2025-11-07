from django.db import models
from django.utils import timezone
from django.conf import settings
from django.core.validators import MinValueValidator

class Labeling(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Rascunho"
        ACTIVE = "active", "Ativa"
        ARCHIVED = "archived", "Arquivada"
        FINISHED = "finished", "Finalizada"

    project = models.ForeignKey("project.Project", on_delete=models.CASCADE, related_name="rotulations")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.DO_NOTHING, related_name="rotulations_created"
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    start_date = models.DateField(null=True, blank=True)
    final_date = models.DateField(null=True, blank=True)

    items_per_user = models.PositiveIntegerField(null=True, blank=True,)

    column_names = models.JSONField(
        default=list, blank=True,
    )

    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DRAFT)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at", "title"] # mais recentes primeiro

    def __str__(self):
        return f"Rotulação:{self.title} Status:({self.get_status_display()})"


class LabelingSection(models.Model):
    labeling = models.ForeignKey("Labeling", on_delete=models.CASCADE, related_name="sections")
    title = models.CharField(max_length=200)
    order = models.PositiveSmallIntegerField(default=1)

    class Meta:
        ordering = ["labeling_id", "order"]
        constraints = [
            models.UniqueConstraint(
                fields=["labeling", "order"], name="unique_section_order_per_labeling"
            ),
        ]

    def __str__(self):
        return f"rotulação :{self.labeling.title} seção: {self.title}"


class LabelingElement(models.Model):
    class QuestionType(models.TextChoices):
        TEXT = "text", "Texto"
        BOOL = "bool", "Booleano"
        NUMBER = "number", "Numérico"
        MULTIPLE_CHOICE = "multiple_choice", "Múltipla escolha"
        RANGE = "range", "Faixa"
        CONTEXT = "context", "Contexto"

    labeling_section = models.ForeignKey(
        LabelingSection, on_delete=models.CASCADE, related_name="elements"
    )
    order = models.PositiveIntegerField(default=1)
    text = models.CharField(max_length=500)
    required = models.BooleanField(default=False)
    question_type = models.CharField(max_length=32, choices=QuestionType.choices)
    column_name = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ["labeling_section_id", "order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["labeling_section", "order"],
                name="unique_element_order_per_section"
            ),
        ]

    def __str__(self):
        return f"[{self.get_question_type_display()}] {self.text}"


class MultipleChoiceItem(models.Model):
    labeling_element = models.ForeignKey(
        LabelingElement, on_delete=models.CASCADE, related_name="choices"
    )
    text = models.CharField(max_length=300)
    value = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ["labeling_element_id", "order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["labeling_element", "order"], name="unique_choice_order_per_element"
            ),
        ]

    def __str__(self):
        return self.text


class QuestionRange(models.Model):
    labeling_element = models.OneToOneField(
        LabelingElement, on_delete=models.CASCADE, related_name="range_cfg"
    )
    start = models.FloatField()
    end = models.FloatField()
    step = models.FloatField(default=1.0, validators=[MinValueValidator(0.0000001)])

    class Meta:
        constraints = [
            models.CheckConstraint(check=models.Q(end__gt=models.F("start")),#garante que o valor final é maior que o inicial
                                   name="range_end_gt_start"),
        ]

    def __str__(self):
        return f"{self.start} … {self.end} (step {self.step})"


class LabelingMembership(models.Model):
    class Role(models.TextChoices):
        OWNER = "owner", "Dono"
        ADMIN = "admin", "Administrador"
        ANNOTATOR = "annotator", "Rotulador"
        VIEWER = "viewer", "Leitor"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="labeling_memberships")
    labeling = models.ForeignKey(Labeling, on_delete=models.CASCADE, related_name="memberships")
    items_done = models.PositiveIntegerField(default=0)
    role = models.CharField(max_length=16, choices=Role.choices, default=Role.ANNOTATOR)
    joined_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = [("user", "labeling")]
        ordering = ["-joined_at"]

    def __str__(self):
        return f"{self.user} {self.labeling} {self.role} {self.items_done}"
