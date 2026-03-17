from django.db import models
from django.utils import timezone
from django.conf import settings
from django.core.validators import MinValueValidator
from user.models import UserGroup
from django.core.exceptions import ValidationError

class Labeling(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Rascunho"
        ACTIVE = "active", "Ativa"
        ARCHIVED = "archived", "Arquivada"
        FINISHED = "finished", "Finalizada"

    class DistributionStrategy(models.TextChoices):
        AUTO = "auto", "Automática" 
        SPECIFIED = "specified", "Estipulada"
        PER_PERSON = "per_person", "Por pessoa"
    
    #background_labeling = models.ForeignKey(null=True, blank=True, on_delete=models.SET_NULL)
    status = models.CharField(choices=Status.choices,default="draft")
    project = models.ForeignKey("project.Project", on_delete=models.CASCADE, related_name="labelings", db_index=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.DO_NOTHING, related_name="labelings_created"
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    start_date = models.DateField(default=timezone.now)
    final_date = models.DateField(null=False, blank=False)
    decision = models.BooleanField(default=False, null=False, blank=False)
    distribution_strategy = models.CharField(max_length=32, default=DistributionStrategy.AUTO, choices=DistributionStrategy.choices)


    guide = models.TextField(default="",blank=True)

    users_per_item = models.PositiveIntegerField(null=False, blank=False,default=1)
    block_section_back = models.BooleanField(default=False)
    has_background_form = models.BooleanField(default=False)

    column_names = models.JSONField(
        default=list, blank=True,
    )

    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DRAFT)
    created_at = models.DateTimeField(default=timezone.now)

    decisive_question = models.ForeignKey("LabelingElement", on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        ordering = ["-created_at", "title"] # mais recentes primeiro

    def clean(self):

        if self.decisive_question and LabelingElement.objects.get(pk=self.decisive_question).question_type != LabelingElement.QuestionType.MULTIPLE_CHOICE:
            raise ValidationError(
                " Só questões de múltipla escolha podem ser decisivas.")
        super().clean()
        

    def __str__(self):
        return f"Rotulação:{self.title} Status:({self.get_status_display()})"

class LabelingGroupQuota(models.Model):
    labeling = models.ForeignKey(
        Labeling,
        related_name="role_quotas",
        on_delete=models.CASCADE,
    )
    group = models.ForeignKey(UserGroup,on_delete=models.DO_NOTHING)
    required_answers_per_item = models.PositiveSmallIntegerField()

    class Meta:
        unique_together = ("labeling", "group")


class LabelingSection(models.Model):
    class FormType(models.TextChoices):
        MAIN = "main", "Principal"
        BACKGROUND = "background", "Background"

    labeling = models.ForeignKey("Labeling", on_delete=models.CASCADE, related_name="sections")
    form_type = models.CharField(
        max_length=16,
        choices=FormType.choices,
        default=FormType.MAIN,
        db_index=True,
    )
    title = models.CharField(max_length=200)
    order = models.PositiveSmallIntegerField(default=1)

    class Meta:
        ordering = ["labeling_id", "form_type", "order"]
        constraints = [
            models.UniqueConstraint(
                fields=["labeling", "form_type", "order"], name="unique_section_order_per_labeling_form_type"
            ),
        ]

    def __str__(self):
        return f"rotulação :{self.labeling.title} seção: {self.title}"


class LabelingElement(models.Model):
    class QuestionType(models.TextChoices):
        TEXT = "text", "Texto"
        NUMBER = "number", "Numérico"
        MULTIPLE_CHOICE = "multiple_choice", "Múltipla escolha"
        RANGE = "range", "Faixa"
        CONTEXT = "context", "Contexto"

    class ContextType(models.TextChoices):
        TEXT = "text", "Texto"
        NUMBER = "number", "Número"
        IMAGE = "image", "Imagem"
        DATE = "date", "Data"
        CATEGORY = "category", "categoria"
        CODE = "code", "Código"
        AUDIO = "audio", "Áudio"
        VIDEO = "video", "Vídeo"
        PDF = "pdf", "PDF"

    labeling_section = models.ForeignKey(
        LabelingSection, on_delete=models.CASCADE, related_name="elements"
    )
    order = models.PositiveIntegerField(default=1)
    text = models.CharField(max_length=500, blank=True)
    required = models.BooleanField(default=False)
    question_type = models.CharField(max_length=32, choices=QuestionType.choices)
    context_type = models.CharField(max_length=32, choices=ContextType.choices, blank=True, null=True)
    column_name = models.CharField(max_length=200, blank=True)
    allow_multiple = models.BooleanField(default=False)
    

    class Meta:
        ordering = ["labeling_section_id", "order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["labeling_section", "order"],
                name="unique_element_order_per_section"
            ),
        ]


        
    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"[{self.get_question_type_display()}] {self.text}"


class MultipleChoiceItem(models.Model):
    labeling_element = models.ForeignKey(
        LabelingElement, on_delete=models.CASCADE, related_name="multiple_choice_items", db_index=True
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
        LabelingElement, on_delete=models.CASCADE, related_name="question_range", db_index=True
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
        indexes = [
            models.Index(fields=['user', 'labeling'], name='user_labeling_idx'),
        ]

    def __str__(self):
        return f"{self.user} {self.labeling} {self.role} {self.items_done}"
