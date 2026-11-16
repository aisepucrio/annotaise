"""Small, repeatable fixtures for manually exercising annotation workflows."""

from datetime import timedelta
from secrets import token_urlsafe
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from answer.models import Answer
from item.models import Item
from project.models import Project, ProjectMembership
from user.models import UserGroup, UserGroupMembership
from ..models import Labeling, LabelingElement, LabelingMembership, LabelingSection, MultipleChoiceItem
from .dependencies import create_dependency


PROJECT_PREFIX = "QA Geral - "
SCENARIOS = (
    ("anonymous_forms", "Forms anônimos", True, "anonymous_mode"),
    ("forms", "Forms identificados", True, "auto"),
    ("anonymous_items", "Rotulações anônimas", False, "anonymous_mode"),
    ("no_groups", "Rotulações sem grupo", False, "auto"),
    ("groups", "Rotulações com grupo", False, "auto"),
    ("per_person", "Por pessoa", False, "per_person"),
    ("dependencies", "Com dependência", False, "auto"),
    ("anonymous_dependencies", "Forms anônimos com dependência", True, "anonymous_mode"),
)
# Every dependent has a prerequisite. Includes a chain, fan-in, an unlocked
# dependency, and a mix of finished/unfinished prerequisites.
DEPENDENCIES = (
    (("no_groups", 0),),
    (("self", 0),),
    (("no_groups", 1), ("no_groups", 2)),
    (("no_groups", 3),),
    (("no_groups", 3), ("no_groups", 4)),
)


def _demo_users(owner, password):
    users, credentials = [], []
    for key, label in (("a", "Grupo A"), ("b", "Grupo B"), ("livre", "Sem grupo")):
        username = f"qa_geral_{owner.pk}_{key}"
        email = f"{username}@annotaise.local"
        user = get_user_model().objects.filter(email__iexact=email).first()
        created_password = None
        if user is None:
            if get_user_model().objects.filter(username=username).exists():
                raise ValidationError(f"O usuário reservado {username} já existe com outro email.")
            created_password = password or token_urlsafe(12)
            user = get_user_model().objects.create_user(
                username=username, email=email, password=created_password,
                first_name="QA Geral", last_name=label,
                account_type="standard", onboarding_status="active",
            )
        elif user.username != username:
            raise ValidationError(f"O email reservado {email} pertence a outro usuário.")
        users.append(user)
        credentials.append({"email": email, "password": created_password, "role": label})
    return users, credentials


def _groups(owner, annotators):
    groups = []
    for suffix, members in (("A", [owner, annotators[0]]), ("B", [annotators[1]])):
        group, _ = UserGroup.objects.get_or_create(
            name=f"QA Geral {owner.pk} - Grupo {suffix}",
            defaults={"created_by": owner, "description": "Grupo de demonstração do seed QA Geral."},
        )
        for user in members:
            UserGroupMembership.objects.get_or_create(group=group, user=user)
        groups.append(group)
    return groups


def _quota(index, groups):
    a, b = (group.name for group in groups)
    return (
        {a: 1, b: 1},
        {a: 1, b: 1, "any": 1},
        {a: 1, "any": 1},
        {b: 1, "any": 1},
        {a: 2, b: 1},
    )[index]


def _guide(key, index, quotas):
    instructions = [
        "# QA Geral",
        "Leia o contexto e envie a resposta. Múltipla escolha e texto são opcionais; pode enviar ambos em branco.",
    ]
    if key in ("anonymous_forms", "anonymous_dependencies"):
        instructions.append("Abra o link anônimo sem login. O formulário aceita vários envios e permanece aberto.")
    elif key == "forms":
        instructions.append("Cada usuário pode responder uma vez. O formulário permanece aberto para novos participantes.")
    elif key == "anonymous_items":
        instructions.append("Abra o link anônimo sem login. Cada envio conclui um item; após três envios a rotulação termina.")
    elif key == "groups":
        instructions.append(f"Cotas por item: {quotas}. Alterne os usuários para preencher as cotas; 'any' aceita qualquer grupo.")
    elif key == "per_person":
        instructions.append("Há um item para o administrador e um para cada anotador de demonstração. Cada pessoa recebe só seu item.")
    else:
        instructions.append("São três itens, com uma resposta por item. Ao terminar os três, a rotulação é finalizada.")
    if key in ("dependencies", "anonymous_dependencies"):
        instructions.append((
            "Bloqueada até concluir 'Rotulações sem grupo 01'.",
            "Bloqueada até concluir a rotulação 01 deste projeto (dependência em cadeia).",
            "Bloqueada até concluir 'Rotulações sem grupo 02' E 'Rotulações sem grupo 03'.",
            "Liberada: 'Rotulações sem grupo 04' já começa finalizada. Reabra esse pré-requisito para testar o bloqueio.",
            "Bloqueada: 'Rotulações sem grupo 04' está finalizada, mas falta concluir 'Rotulações sem grupo 05'.",
        )[index])
        instructions.append("Nas opções, tente adicionar uma dependência duplicada, invertida ou que feche a cadeia: deve ser rejeitada.")
    if key == "no_groups" and index == 3:
        instructions.append("Esta rotulação começa finalizada, com respostas de demonstração, para liberar os cenários de dependência 04.")
    return "\n\n".join(instructions)


def _structure(labeling):
    section = LabelingSection.objects.create(labeling=labeling, title="Formulário de teste", order=1)
    LabelingElement.objects.create(
        labeling_section=section, order=1, question_type="context", context_type="text",
        column_name="contexto", text="Contexto do teste", required=False,
    )
    choice = LabelingElement.objects.create(
        labeling_section=section, order=2, question_type="multiple_choice",
        text="O contexto está claro?", required=False,
    )
    MultipleChoiceItem.objects.bulk_create([
        MultipleChoiceItem(labeling_element=choice, text=text, order=order)
        for order, text in enumerate(("Sim", "Não", "Não sei"), start=1)
    ])
    LabelingElement.objects.create(
        labeling_section=section, order=3, question_type="text",
        text="Comentário (opcional)", required=False,
    )
    return choice


def _items(labeling, participants, finished, choice, owner):
    if labeling.form_mode:
        assignees = [None]
    elif labeling.distribution_strategy == "per_person":
        assignees = participants
    else:
        assignees = [None] * 3
    for index, assignee in enumerate(assignees):
        payload = {"contexto": f"{labeling.title} — exemplo {index + 1}. Este é um texto simples para testar o fluxo de respostas."}
        if assignee:
            payload["user_id"] = assignee.pk
            payload["contexto"] += f" Item destinado a {assignee.email}."
        item = Item.objects.create(
            labeling=labeling, row_index=index, payload=payload,
            status="finished" if finished else "pending",
        )
        if finished:
            Answer.objects.create(
                labeling=labeling, item=item, answered_by=owner,
                answer_payload={str(choice.pk): "Sim"},
            )


@transaction.atomic
def seed_workflow_qa(owner, *, demo_password=None):
    """Create missing scenarios; preserve existing items, answers, tokens and edits.

    All names are scoped to the owning administrator. No reset/delete path is
    provided: re-running a seed must not destroy someone's manual QA session.
    """
    annotators, credentials = _demo_users(owner, demo_password)
    groups = _groups(owner, annotators)
    participants = [owner, *annotators]
    scenarios, projects, new_labelings = {}, [], set()
    for key, title, form_mode, strategy in SCENARIOS:
        project, _ = Project.objects.get_or_create(
            name=PROJECT_PREFIX + title, created_by=owner,
            defaults={"status": "active", "description": "QA Geral: cinco cenários simples para testar " + title.lower() + "."},
        )
        projects.append(project)
        for user in participants:
            ProjectMembership.objects.get_or_create(
                project=project, user=user,
                defaults={"role": "owner" if user == owner else "annotator"},
            )
        scenarios[key] = []
        for index in range(5):
            quotas = _quota(index, groups) if key == "groups" else {"any": 1}
            finished = key == "no_groups" and index == 3
            labeling, created = Labeling.objects.get_or_create(
                project=project, title=f"{title} {index + 1:02d}", created_by=owner,
                defaults={
                    "status": "finished" if finished else "active",
                    "start_date": timezone.localdate(), "final_date": timezone.localdate() + timedelta(days=90),
                    "form_mode": form_mode, "distribution_strategy": strategy,
                    "anonymous_token": uuid4() if strategy == "anonymous_mode" else None,
                    "users_per_item": sum(quotas.values()), "items_per_group": quotas,
                    "column_names": ["contexto", "user_id"] if strategy == "per_person" else ["contexto"],
                    "guide": _guide(key, index, quotas),
                },
            )
            scenarios[key].append(labeling)
            if not created:
                continue
            new_labelings.add(labeling.pk)
            for user in participants:
                LabelingMembership.objects.create(
                    labeling=labeling, user=user, role="owner" if user == owner else "annotator",
                )
            choice = _structure(labeling)
            _items(labeling, participants, finished, choice, owner)

    for key in ("dependencies", "anonymous_dependencies"):
        for labeling, prerequisites in zip(scenarios[key], DEPENDENCIES):
            if labeling.pk not in new_labelings:
                continue
            for scenario, index in prerequisites:
                create_dependency(labeling, scenarios[key if scenario == "self" else scenario][index])

    return {
        "projects": projects, "labelings": scenarios, "credentials": credentials,
        "created": len(new_labelings), "preserved": 40 - len(new_labelings),
        "groups": groups,
    }
