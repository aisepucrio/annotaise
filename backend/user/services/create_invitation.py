    
from django.db import transaction
from annotaise.settings import FRONTEND_URL
from rest_framework import status
from ..models import Invitation
from ..utils import send_invitation_email
from project.models import ProjectMembership


def create(*, invited_by, email, role, project_ids, labeling_ids, _resolve_labeling_assignment_ids, email_language):
        '''apos a criação do convite é enviado um email com o token para o email convidado'''

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # email = serializer.validated_data.get("email", None)
        # role = serializer.validated_data.get("role")
        # project_ids = serializer.validated_data.get("project_ids", [])
        # labeling_ids = serializer.validated_data.get("labeling_ids", [])
        # email_language = serializer.validated_data.get("email_language", "pt-BR")

        with transaction.atomic():
            user, err = self._create_or_get_pending_user(email, role)

            resolved_labeling_ids = _resolve_labeling_assignment_ids(
               request_user=invited_by,
               project_ids=project_ids,
               labeling_ids=labeling_ids,
               )
            
            if err == "active_exists":
                return Response(
                    {"detail": "Usuário com esse email já existe.", "code": "EMAIL_ALREADY_EXISTS"},
                    status=400,
                )
            
            self._assign_user_to_labelings(user, resolved_labeling_ids)


            invitation = Invitation.objects.create(
            invited_by=invited_by,
            user=user,
            email=email,
            role=role,
            )

            resolved_labeling_ids, assignment_error = self._resolve_labeling_assignment_ids(
                request_user=request.user,
                project_ids=project_ids,
                labeling_ids=labeling_ids,
            )
            if assignment_error is not None:
                return assignment_error


        link = FRONTEND_URL + f"/accept-invitation/{invitation.token}?lang={email_language}"
        transaction.on_commit(lambda: send_invitation_email(invitation, link, language=email_language))

        return {"invitation": invitation, "link": link}

