import uuid
from django.db import transaction
from rest_framework.exceptions import ValidationError
from annotaise.settings import FRONTEND_URL
from labeling.models import Labeling, LabelingMembership
from project.models import ProjectMembership

from ..models import Invitation, CustomUser
from ..utils import send_invitation_email


def create_invitation(*, invited_by, email, role, project_ids, labeling_ids, email_language):
    with transaction.atomic():
        user = _create_or_get_pending_user(email, role)

        resolved_labeling_ids = _resolve_labeling_assignment_ids(
            request_user=invited_by,
            project_ids=project_ids,
            labeling_ids=labeling_ids,
        )

        _assign_user_to_labelings(user, resolved_labeling_ids)

        invitation = Invitation.objects.create(
            invited_by=invited_by,
            user=user,
            email=email,
            role=role,
        )

    link = FRONTEND_URL + f"/accept-invitation/{invitation.token}?lang={email_language}"
    transaction.on_commit(lambda: send_invitation_email(invitation, link, language=email_language))

    return {"invitation": invitation, "link": link}


def _create_or_get_pending_user(email, role):
    normalized_email = (email or "").strip().lower()
    existing_user = CustomUser.objects.filter(email__iexact=normalized_email).first()

    if existing_user and existing_user.onboarding_status == CustomUser.OnboardingStatus.ACTIVE:
        raise ValidationError({
            "detail": "Usuário com esse email já existe.",
            "code": "EMAIL_ALREADY_EXISTS",
        })

    if existing_user:
        user = existing_user
        user.account_type = role
        user.is_active = False
        user.onboarding_status = CustomUser.OnboardingStatus.PENDING
        user.save(update_fields=["account_type", "is_active", "onboarding_status"])
        return user

    user_id = uuid.uuid4().hex
    user = CustomUser.objects.create(
        username=user_id,
        email=normalized_email,
        first_name="",
        last_name="",
        account_type=role,
        is_active=False,
        onboarding_status=CustomUser.OnboardingStatus.PENDING,
    )
    user.set_unusable_password()
    user.save(update_fields=["password"])
    return user  


def _parse_int_ids(raw_ids):
    valid_ids = []
    invalid_ids = []
    for raw_id in raw_ids or []:
        try:
            valid_ids.append(int(raw_id))
        except (TypeError, ValueError):
            invalid_ids.append(raw_id)
    return valid_ids, invalid_ids


def _assign_user_to_labelings(target_user, labeling_ids):
    if not labeling_ids:
        return

    memberships = LabelingMembership.objects.filter(
        labeling_id__in=labeling_ids,
        user=target_user,
    )
    memberships_by_labeling = {membership.labeling_id: membership for membership in memberships}

    for labeling_id in labeling_ids:
        membership = memberships_by_labeling.get(labeling_id)
        if membership is None:
            LabelingMembership.objects.create(
                labeling_id=labeling_id,
                user=target_user,
                role=LabelingMembership.Role.ANNOTATOR,
            )
            continue

        if membership.role == LabelingMembership.Role.VIEWER:
            membership.role = LabelingMembership.Role.ANNOTATOR
            membership.save(update_fields=["role"])


def _resolve_labeling_assignment_ids(request_user, project_ids, labeling_ids):
    valid_project_ids, invalid_project_ids = _parse_int_ids(project_ids)
    if invalid_project_ids:
        raise ValidationError({
            "detail": "Há project_ids inválidos.",
            "code": "INVALID_PROJECT_IDS",
            "invalid_project_ids": invalid_project_ids,
        })

    valid_labeling_ids, invalid_labeling_ids = _parse_int_ids(labeling_ids)
    if invalid_labeling_ids:
        raise ValidationError({
            "detail": "Há labeling_ids inválidos.",
            "code": "INVALID_LABELING_IDS",
            "invalid_labeling_ids": invalid_labeling_ids,
        })

    owner_project_ids = set(
        ProjectMembership.objects.filter(
            user=request_user,
            role=ProjectMembership.RoleChoices.OWNER,
        ).values_list("project_id", flat=True)
    )

    requested_project_ids = set(valid_project_ids)
    unauthorized_project_ids = sorted(requested_project_ids - owner_project_ids)
    if unauthorized_project_ids:
        raise ValidationError({
            "detail": "Você só pode atribuir usuários em projetos onde é owner.",
            "code": "PROJECT_ASSIGNMENT_FORBIDDEN",
            "project_ids": unauthorized_project_ids,
        })

    requested_labeling_ids = set(valid_labeling_ids)
    requested_labeling_map = {
        item["id"]: item["project_id"]
        for item in Labeling.objects.filter(id__in=requested_labeling_ids).values("id", "project_id")
    }
    missing_labeling_ids = sorted(requested_labeling_ids - set(requested_labeling_map.keys()))
    if missing_labeling_ids:
        raise ValidationError({
            "detail": "Há labeling_ids inexistentes.",
            "code": "LABELING_NOT_FOUND",
            "labeling_ids": missing_labeling_ids,
        })

    unauthorized_labeling_ids = sorted(
        labeling_id
        for labeling_id, project_id in requested_labeling_map.items()
        if project_id not in owner_project_ids
    )
    if unauthorized_labeling_ids:
        raise ValidationError({
            "detail": "Você só pode atribuir usuários em rotulações de projetos onde é owner.",
            "code": "LABELING_ASSIGNMENT_FORBIDDEN",
            "labeling_ids": unauthorized_labeling_ids,
        })

    expanded_from_projects = set(
        Labeling.objects.filter(project_id__in=requested_project_ids).values_list("id", flat=True)
    )
    return expanded_from_projects | requested_labeling_ids