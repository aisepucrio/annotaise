from django.shortcuts import render
from rest_framework import viewsets
from .models import Project, ProjectMembership
from .serializers import ProjectSerializer, ProjectMembershipSerializer, ProjectDashboardSerializer
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from user.permissions import IsAdminAccount

class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    queryset = Project.objects.all()
    http_method_names = ['get', 'post', 'patch', 'delete']


    def get_serializer_class(self):
        if self.action == "dashboard":
            return ProjectDashboardSerializer
        return ProjectSerializer

    @action(detail=False, methods=["get"], url_path="dashboard")
    def dashboard(self, request):
        projects = Project.objects.filter(memberships__user = request.user)

        response_data = []
        '''TODO implementar late labelings'''
        for project in projects:
            data = {
                "id": project.id,
                "name": project.name,
                "labeling_users": project.labelings.values("memberships__user").distinct().count(),
                "finished_labelings": project.labelings.filter(status="finished").count(),
                "pending_labelings": project.labelings.filter(status="pending").count(),
                "late_labelings": project.labelings.filter(status="late").count(), 
            }
            
            response_data.append(data)

        serializer = self.get_serializer(data=response_data, many=True)

        if serializer.is_valid():
            return Response(serializer.data)
        else:
            return Response("Erro ao retornar dados",status= status.HTTP_403_FORBIDDEN)

    def get_queryset(self):
        user = getattr(self.request, "user", None)

        if not user or not getattr(user, "is_authenticated", False):
            return self.queryset.none()

        # Filtra projetos onde o usuário é membro
        qs = (self.queryset
              .filter(memberships__user=user)
              .prefetch_related('memberships__user')
              .distinct())
        return qs

    def perform_create(self, serializer):
        if not IsAdminAccount().has_permission(self.request, self):
            raise PermissionDenied("Somente administradores podem criar projetos.")
        project = serializer.save(created_by=self.request.user)
    
        ProjectMembership.objects.get_or_create(
            project=project, user=self.request.user, defaults={"role": "owner"}
        )

    def destroy(self, request, *args, **kwargs):
        project = self.get_object()
        user = request.user
        is_admin = IsAdminAccount().has_permission(request, self)
        is_owner = ProjectMembership.objects.filter(project=project, user=user, role="owner").exists()

        if not is_admin:
            return Response({'detail': 'Você não tem permissão para deletar este projeto.'}, status=status.HTTP_403_FORBIDDEN)

        return super().destroy(request, *args, **kwargs)
    
    def update(self, request, *args, **kwargs):
        project = self.get_object()
        if not IsAdminAccount().has_permission(request, self):
            raise PermissionDenied("Somente administradores podem editar projetos.")
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        project = self.get_object()
        if not IsAdminAccount().has_permission(request, self):
            raise PermissionDenied("Somente administradores podem editar projetos.")
        return super().partial_update(request, *args, **kwargs)
    

class ProjectMembershipViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectMembershipSerializer
    queryset = ProjectMembership.objects.select_related('project', 'user')
    http_method_names = ['get', 'post','put', 'patch', 'delete']

    def create(self, request):
        is_owner = ProjectMembership.objects.filter(
            project_id=request.data.get('project'),
            user=request.user,
            role='owner'
        ).exists()

        if not is_owner:
            return Response({'detail': 'Você não tem permissão para adicionar membros a este projeto.'}, status=status.HTTP_403_FORBIDDEN)
        return super().create(request)
    
    def get_queryset(self):
        user = getattr(self.request, "user", None)
        project_param = self.request.query_params.get("project")

        if not user or not getattr(user, "is_authenticated", False):
            return self.queryset.none()

        if user.is_staff:
            qs = self.queryset
        else:
            qs = (
                self.queryset.filter(
                    project__memberships__user=user,
                    project__memberships__role=ProjectMembership.RoleChoices.OWNER,
                )
                .distinct()
            )

        if project_param and project_param.isdigit():
            qs = qs.filter(project_id=project_param)

        return qs
