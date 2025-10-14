from django.db import models
from django.contrib.auth.models import AbstractUser

class CustomUser(AbstractUser):
    pass # criei somente caso precisemos de campos novos futuramente, mas por enquanto é dispensável

class Project(models.Model):
    members = models.ManyToManyField(CustomUser,through='ProjectMembership', related_name='users')
    title = models.CharField(max_length=40)
    STATUS_CHOICES = [("Feito","done"),("Em andamento","ongoing"),("Não começou","not_started")]
    status = models.CharField(max_length=90,choices=STATUS_CHOICES)
    rotulation_per_user = models.IntegerField()

class ProjectMembership(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='project_memberships')
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='memberships')

    rotulations_made = models.PositiveIntegerField(default=0)

    role = models.CharField(max_length=40, default='member')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'project') # isso garante que não terao 2 relações iguais

class Labeling(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    start_date = models.DateField()
    final_date = models.DateField()

class QuestionBlock(models.Model):
    '''essa classe define os blocos de perguntas, que futuramente podemos aplicar paginação
    e outras técnicas'''
    label = models.ForeignKey(Labeling, on_delete=models.CASCADE)
    text = models.CharField(max_length=200)
    order = models.IntegerField()

class QuestionType(models.TextChoices):
    # algo como um enum
    TEXT = 'text', 'Text'
    RANGE = 'range', 'Range Selector'
    CHECKBOX = 'checkbox', 'Checkbox'
    MULTICHOICE = 'multichoice', 'Multiple Choice'
    IMAGE = 'image', 'Image'
    AUDIO = 'audio', 'Audio'

class QuestionElement(models.Model):
    '''essa classe é como um molde pra todo tipo de input que possa ter dentro de um
    bloco. logo, todo input é um question element, e cada question element está dentro
    de um bloco. o atributo qtype define o tipo de campo desse input. os atributos de
    imagem e textuais são opcionais e servem so pra contextualizar a pergunta caso
    o usuario queira'''
    block = models.ForeignKey(QuestionBlock, on_delete=models.CASCADE, related_name='elements')
    qtype = models.CharField(max_length=20, choices=QuestionType.choices)
    text = models.CharField(max_length=200,null=True, blank=True)# opcional
    image = models.ImageField(null=True, blank=True)  # opcional
    required = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def get_element_variant(self):
        mapping = {
            'text': 'text_variant',
            'range': 'range_variant',
            'checkbox': 'checkbox_variant',
            'multichoice': 'multichoice_variant',
            'image': 'image_variant',
            'audio': 'audio_variant',
        }
        attr = mapping.get(self.qtype)
        return getattr(self, attr, None)


class MultipleChoice(models.Model): # cobre multipla escolha e checkboxes
    element = models.OneToOneField(
        QuestionElement,
        on_delete=models.CASCADE,
        related_name='multichoice_variant',
        primary_key=True
    )
    allow_multiple = models.BooleanField(default=False)# pra checkboxes
    shuffle_options = models.BooleanField(default=False)

    def __str__(self):
        return f'Multipla Escolha:{self.element.text}'


class MultipleChoiceItem(models.Model):
    element = models.ForeignKey(QuestionElement, on_delete=models.CASCADE, related_name='options')
    text = models.CharField(max_length=200)
    value = models.CharField(max_length=100, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.text


class QuestionText(models.Model):
    element = models.OneToOneField(
        QuestionElement, on_delete=models.CASCADE, related_name='text_variant', primary_key=True
    )
    max_length = models.PositiveIntegerField(null=True, blank=True)
    placeholder = models.CharField(max_length=200, blank=True)


class QuestionRange(models.Model):
    element = models.OneToOneField(
        QuestionElement, on_delete=models.CASCADE, related_name='range_variant', primary_key=True
    )
    min_value = models.FloatField(default=0)
    max_value = models.FloatField(default=10)
    step = models.FloatField(default=1.0)


class Submission(models.Model):
    """
    Uma submissão de um usuário para um rotulo (label)
    """
    labeling = models.ForeignKey('Labeling', on_delete=models.CASCADE, related_name='submissions')
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, null=True, blank=True, related_name='submissions')
    started_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['labeling', 'user']),
        ]

    def __str__(self):
        return f'Submission #{self.pk} ({self.user_id})'


class Answer(models.Model):
    """
    Uma resposta para UMA única pergunta dentro de uma submissão.
    - single choice: use 'selected_option'
    - multi choice: use AnswerOption (N linhas)
    - Text/Range/Checkbox/Image/Audio: use os campos abaixo conforme o tipo
    """
    submission = models.ForeignKey(Submission, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey('QuestionElement', on_delete=models.CASCADE, related_name='answers')

    # Para SINGLE CHOICE
    selected_option = models.ForeignKey('MultipleChoiceItem', on_delete=models.CASCADE, null=True, blank=True, related_name='selected_in_answers')

    # Valores genéricos por tipo (todos opcionais)
    text_value = models.TextField(null=True, blank=True)        # TEXT
    number_value = models.FloatField(null=True, blank=True)     # RANGE / NUMBER
    bool_value = models.BooleanField(null=True, blank=True)     # CHECKBOX
    file = models.FileField(upload_to='uploads/', null=True, blank=True)  # IMAGE/AUDIO/FILE

    answered_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('submission', 'question')  # 1 resposta por pergunta/submissão
        indexes = [
            models.Index(fields=['submission', 'question']),
        ]

    def __str__(self):
        return f'Answer #{self.pk} = Question#{self.question_id}'


class AnswerOption(models.Model):
    """
    isso é para opções marcadas para múltipla escolha (checkbox/multi).
    pra single choice, use 'selected_option' em Answer.
    """
    answer = models.ForeignKey(Answer, on_delete=models.CASCADE, related_name='option_values')
    option = models.ForeignKey('MultipleChoiceItem', on_delete=models.CASCADE, related_name='chosen_in_answers')

    class Meta:
        indexes = [
            models.Index(fields=['answer']), #isso melhora a performance do banco de dados
        ]

    def __str__(self):
        return f'AnswerOption #{self.pk} (Answer {self.answer_id})'

