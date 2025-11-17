from django.shortcuts import render
from rest_framework import viewsets, status
from .models import Labeling, LabelingMembership
from project.models import ProjectMembership
from .serializers import LabelingSerializer, LabelingMembershipSerializer
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from project.models import Project
from django.shortcuts import get_object_or_404
from rest_framework.decorators import action

class LabelingViewSet(viewsets.ModelViewSet):
    serializer_class = LabelingSerializer
    queryset = Labeling.objects.all()
    http_method_names = ['get', 'post', 'patch', 'delete']

    def get_queryset(self):
        user = getattr(self.request, "user", None)

        if not user or not getattr(user, "is_authenticated", False):
            return self.queryset.none()

        # admin (opcional):
        if user.is_staff:
            return self.queryset.prefetch_related('memberships__user')

        # Filtra rotulações onde o usuário participa
        qs = (self.queryset
              .filter(memberships__user=user)
              .prefetch_related('memberships__user')
              .distinct())
        return qs

    def perform_create(self, serializer):
        project_id = serializer.validated_data['project'].id
        

        allowed_roles = [
            getattr(ProjectMembership.RoleChoices, "OWNER", "owner"),
            getattr(ProjectMembership.RoleChoices, "EDITOR", "editor"),
        ]

        can_edit_project = ProjectMembership.objects.filter(
            project_id=project_id,
            user=self.request.user,
            role__in=allowed_roles,
        ).exists()

        if not can_edit_project:
            raise PermissionDenied("Você não tem permissão para adicionar rotulações a este projeto.")

        labeling = serializer.save(created_by=self.request.user)

        LabelingMembership.objects.get_or_create(
            labeling=labeling, user=self.request.user, defaults={"role": "owner"}
        )

    def destroy(self, request, *args, **kwargs):
        labeling = self.get_object()
        user = request.user

        is_owner = LabelingMembership.objects.filter(labeling=labeling, user=user, role='owner').first()
        if not is_owner:

            return Response({'detail': 'Você não tem permissão para deletar esta rotulação.'}, status=status.HTTP_403_FORBIDDEN)

        return super().destroy(request, *args, **kwargs)
    

class ProjectMembershipViewSet(viewsets.ModelViewSet):
    serializer_class = LabelingMembershipSerializer
    queryset = LabelingMembership.objects.select_related('labeling', 'user')
    http_method_names = ['get', 'post', 'patch', 'delete']

    def update(self, request, *args, **kwargs):
        labeling_membership = self.get_object()
        user = request.user

        is_owner = LabelingMembership.objects.filter(
            labeling=labeling_membership.labeling,
            user=user,
            role='owner'
        ).exists()

        if not is_owner:
            return Response({'detail': 'Você não tem permissão para alterar este membro da rotulação.'}, status=status.HTTP_403_FORBIDDEN)

        return super().update(request, *args, **kwargs)

    def create(self, request):

        labeling_id = request.data.get('labeling')

        m = get_object_or_404(
            Labeling.objects.select_related("project"),
            pk=labeling_id
        )

        project_id = m.project_id        # mais leve (sem hit extra)

        is_owner = LabelingMembership.objects.filter(
            labeling_id=request.data.get('labeling'),
            user=request.user,
            role='owner'
        ).exists()


        is_in_project = ProjectMembership.objects.filter(
            project_id=project_id,
            user=request.data.get('user')).exists()

        if not is_owner:
            return Response({'detail': 'Você não tem permissão para adicionar membros a este projeto.'}, status=status.HTTP_403_FORBIDDEN)

        elif not is_in_project:
            return Response({'detail': 'O usuário adicionado não faz parte do projeto associado a esta rotulação.'}, status=status.HTTP_400_BAD_REQUEST)
        
        return super().create(request)
    
    def get_queryset(self):
        user = getattr(self.request, "user", None)
        username = getattr(user, "username", "anonymous")

        if not user or not getattr(user, "is_authenticated", False):
            return self.queryset.none()

        if user.is_staff:
            return self.queryset

        return (
            self.queryset.filter(
                labeling__memberships__user=user,
                labeling__memberships__role=ProjectMembership.RoleChoices.OWNER,
            )
            .distinct()
        )
