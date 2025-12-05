from django.shortcuts import render
from rest_framework import viewsets
from .models import Project, ProjectMembership
from .serializers import ProjectSerializer, ProjectMembershipSerializer, ProjectDashboardSerializer
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from user.permissions import IsAdminAccount, CanEditAccount
from django.db.models import Count, Q
from .permissions import IsProjectOwnerPermission
class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    http_method_names = ['get', 'post', 'patch', 'delete']
    

    def get_permissions(self):
        if self.action in ["dashboard","create"]:
            self.permission_classes =  [IsAdminAccount]
        elif self.action in ["update", "partial_update", "destroy", "patch"]:
            self.permission_classes =  [IsAdminAccount, IsProjectOwnerPermission]
        else:
            self.permission_classes = [IsAdminAccount]
        return super().get_permissions()
    
    def get_serializer_class(self):
        if self.action == "dashboard":
            return ProjectDashboardSerializer
        return ProjectSerializer

    @action(detail=False, methods=["get"], url_path="dashboard")
    def dashboard(self, request):
        search = request.query_params.get("search")
        projects = (
            self.get_queryset()
            .annotate(
                labeling_users=Count("labelings__memberships__user", distinct=True),
                finished_labelings=Count(
                    "labelings__items",
                    filter=Q(labelings__items__status="finished"),
                    distinct=True,
                ),
                pending_labelings=Count(
                    "labelings__items",
                    filter=Q(labelings__items__status="pending"),
                    distinct=True,
                ),
                late_labelings=Count(
                    "labelings__items",
                    filter=Q(labelings__items__status="late"),
                    distinct=True,
                ),
            )
        )

        if search:
            projects = projects.filter(
                Q(name__icontains=search) | Q(description__icontains=search)
            )

        response_data = []
        for project in projects:
            data = {
                "id": project.id,
                "name": project.name,
                "labeling_users": project.labeling_users,
                "finished_labelings": project.finished_labelings,
                "pending_labelings": project.pending_labelings,
                "late_labelings": project.late_labelings,
            }
            
            response_data.append(data)

        serializer = self.get_serializer(data=response_data, many=True)

        if serializer.is_valid():
            return Response(serializer.data)
        else:
            return Response("Erro ao retornar dados",status=403)

    def get_queryset(self):
        user = self.request.user

        qs = (Project.objects
              .filter(memberships__user=user)
              .prefetch_related('memberships__user')
              .distinct())
        
        return qs
        
        
    def perform_create(self, serializer):
        project = serializer.save(created_by=self.request.user)
    
        ProjectMembership.objects.get_or_create(
            project=project, user=self.request.user, defaults={"role": "owner"}
        )
        return project
    
    

class ProjectMembershipViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectMembershipSerializer
    queryset = ProjectMembership.objects.select_related('project', 'user')
    http_method_names = ['get', 'post','put', 'patch', 'delete']
    permission_classes = [IsAdminAccount,IsProjectOwnerPermission]

    
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
