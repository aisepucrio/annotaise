from django.db import models
from django.contrib.auth.models import AbstractUser

# USERS e PROJECTS

class CustomUser(AbstractUser):
    '''deixei somente por organização, se precisarmos de algum campo futuramente'''
    def __str__(self):
        return self.username


class Project(models.Model):
    STATUS_CHOICES = [
        ("active", "active"),
        ("paused", "paused"),
        ("closed", "closed"),
    ]

    title = models.CharField(max_length=255)
    description = models.CharField(max_length=500)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    rotulation_per_user = models.IntegerField()

    def __str__(self):
        return self.title


class ProjectMembership(models.Model):
    ROLE_CHOICES = [
        ("owner", "owner"),
        ("manager", "manager"),
        ("labeler", "labeler"),
        ("viewer", "viewer"),
    ]

    user = models.ForeignKey("CustomUser", on_delete=models.CASCADE)
    project = models.ForeignKey("Project", on_delete=models.CASCADE)
    rotulations_made = models.IntegerField() # usuario -> projeto
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    joined_at = models.DateField()


# FORM (MOLDES DE ROTULAÇÃO)

class Form(models.Model):
    '''o atributo column names serve para oferecer as opções de coluna no seletor na hora de
    montar o formulário.'''
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    created_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    start_date = models.DateField()
    final_date = models.DateField()
    done = models.BooleanField(default=False)
    column_names = models.JSONField(default=list)  

    def __str__(self):
        return self.title


class FormSection(models.Model):
    '''uma seção é uma página de varios FormElements(blocos)'''
    form = models.ForeignKey(Form, on_delete=models.CASCADE)
    order = models.IntegerField()# ordem que aparece
    title = models.CharField(max_length=255)


class FormElement(models.Model):
    form_section = models.ForeignKey(FormSection, on_delete=models.CASCADE)
    order = models.IntegerField()
    attributes = models.JSONField(default=dict)#se precisar de alguma descrição sobre a imagem, arquivo, etc
    text = models.CharField(max_length=500)
    image = models.ImageField(upload_to="form_elements/images/", null=True, blank=True)
    sound = models.FileField(upload_to="form_elements/sounds/", null=True, blank=True)


class FormContext(models.Model):
    form_element = models.OneToOneField(FormElement, on_delete=models.CASCADE)
    column_name = models.CharField(max_length=255)


class FormQuestion(models.Model):
    QUESTION_TYPE_CHOICES = [
        ("text", "text"),
        ("number", "number"),
        ("bool", "bool"),
        ("date", "date"),
        ("range", "range"),
        ("single_choice", "single_choice"),
        ("multi_choice", "multi_choice"),
        ("image", "image"),
        ("audio", "audio"),
        ("file", "file"),
    ]

    form_element = models.OneToOneField(FormElement, on_delete=models.CASCADE)
    required = models.BooleanField(default=False)
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPE_CHOICES)


class MultipleChoiceItem(models.Model):
    form_question = models.ForeignKey(FormQuestion, on_delete=models.CASCADE)
    text = models.CharField(max_length=255)
    value = models.BooleanField()
    order = models.IntegerField() # ordem dentro da múltipla escolha


class QuestionRange(models.Model):
    question = models.ForeignKey(FormQuestion, on_delete=models.CASCADE)
    start = models.FloatField()
    end = models.FloatField()
    step = models.FloatField()# de quanto em quanto


# Rotulação (GERAÇÃO A PARTIR DO DATASET)

class Labeling(models.Model):
    STATUS_CHOICES = [
        ("pending", "pending"),
        ("in_progress", "in_progress"),
        ("done", "done"),
    ]

    row_context = models.JSONField(default=dict)  # "coluna": "valor"
    row_index = models.IntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    form = models.ForeignKey(Form, on_delete=models.CASCADE)# o molde a ser preenchido


# ANSWER


class Answer(models.Model):
    '''o valor de texto é uma lista, então no caso de checkboxes o answer será um array
    de strings (as respostas em questão)'''
    labeling = models.ForeignKey(Labeling, on_delete=models.CASCADE)
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    submitted_at = models.DateTimeField()

    text_value = models.JSONField(default=list, blank=True)  # JsonField -> list
    number_value = models.FloatField(null=True, blank=True)
    bool_value = models.BooleanField(null=True, blank=True)
