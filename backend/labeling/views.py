from django.shortcuts import render
from rest_framework import viewsets, status
from .models import Labeling, LabelingMembership, LabelingSection
from project.models import ProjectMembership
from .serializers import (LabelingSerializer, LabelingMembershipSerializer,
LabelingSectionsBulkCreateSerializer, LabelingSectionSerializer, LabelingDashboardSerializer)
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from project.models import Project
from django.shortcuts import get_object_or_404
from rest_framework.decorators import action
from rest_framework.views import APIView
from django.db import transaction
from django.db.models import Count, Q
from drf_spectacular.utils import extend_schema
from datetime import datetime, timedelta
import json
from user.permissions import IsAdminAccount

class LabelingViewSet(viewsets.ModelViewSet):
    queryset = Labeling.objects.all()
    http_method_names = ['get', 'post', 'patch', 'delete']

    def get_serializer_class(self):
        if self.action == 'dashboard':
            return LabelingDashboardSerializer
        else: return LabelingSerializer

    @action(methods=['get'], detail=False, url_path='dashboard')
    def dashboard(self, request):
        today = datetime.now().date()
        output = []
        qs = (
            self.get_queryset()
            .select_related('project')
            .annotate(
                total_labelings=Count('items', distinct=True),
                done_labelings=Count(
                    'items',
                    filter=Q(items__status='finished'),
                    distinct=True),
            )
        )
        for element in qs:
            output.append({
                "id" : element.id,
                "labeling_name" : element.title,
                "project_name" : element.project.name,
                "total_days" : (element.final_date - element.start_date).days,
                "days_passed" : (today - element.start_date).days,
                "items_done" : element.done_labelings,
                "total_items" : element.total_labelings,
            })
        ser = self.get_serializer_class() 
        ser = ser(data=output,many=True)   
        if ser.is_valid():
            return Response(ser.data, status=200)
        else:
            return Response('Erro ao carregar labelings dashboard', status=400)

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
        user = self.request.user
        project = serializer.validated_data.get("project")

        is_staff = getattr(user, "is_staff", False)
        is_project_owner = ProjectMembership.objects.filter(
            project=project, user=user, role=ProjectMembership.RoleChoices.OWNER
        ).exists()

        if not (is_staff or is_project_owner):
            raise PermissionDenied("Somente donos do projeto (ou administradores) podem criar rotulações.")

        labeling = serializer.save(created_by=user)

        LabelingMembership.objects.get_or_create(
            labeling=labeling,
            user=user,
            defaults={"role": LabelingMembership.Role.OWNER},
        )

    def destroy(self, request, *args, **kwargs):
        labeling = self.get_object()
        user = request.user

        is_owner = LabelingMembership.objects.filter(
            labeling=labeling,
            user=user,
            role=LabelingMembership.Role.OWNER,
        ).exists()

        if not (getattr(user, "is_staff", False) or is_owner):
            return Response({'detail': 'Você não tem permissão para deletar esta rotulação.'}, status=status.HTTP_403_FORBIDDEN)

        return super().destroy(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        labeling = self.get_object()
        user = request.user
        is_owner = LabelingMembership.objects.filter(
            labeling=labeling,
            user=user,
            role=LabelingMembership.Role.OWNER,
        ).exists()
        if not (getattr(user, "is_staff", False) or is_owner):
            raise PermissionDenied("Somente donos da rotulação (ou administradores) podem editar.")
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        labeling = self.get_object()
        user = request.user
        is_owner = LabelingMembership.objects.filter(
            labeling=labeling,
            user=user,
            role=LabelingMembership.Role.OWNER,
        ).exists()
        if not (getattr(user, "is_staff", False) or is_owner):
            raise PermissionDenied("Somente donos da rotulação (ou administradores) podem editar.")
        return super().partial_update(request, *args, **kwargs)
    

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

class CreateReadLabelingStructureView(APIView):
    
    @extend_schema(
        responses={200: [LabelingSectionSerializer]},      # resposta
        examples=None)    
    def get(self, request, labeling_id):
        labeling = get_object_or_404(Labeling, id=labeling_id)
        sections = LabelingSection.objects.filter(labeling=labeling)
        out = LabelingSectionSerializer(sections, many=True).data
        return Response(out, status=status.HTTP_200_OK)

    @extend_schema(
        request=LabelingSectionsBulkCreateSerializer,         # corpo esperado
        responses={200: [LabelingSectionSerializer]},      # resposta
        examples=None)
    @transaction.atomic # importante pra se der problema nao deletar o que ja existe
    def put(self, request, labeling_id):
        labeling = get_object_or_404(Labeling, id=labeling_id)

        # Remove toda a estrutura atual
        LabelingSection.objects.filter(labeling=labeling).delete()

        # Serializa e valida as novas sections
        serializer = LabelingSectionsBulkCreateSerializer(
            data=request.data,
            context={
                'request': request,
                'labeling': labeling,
            }
        )
        try:
            serializer.is_valid(raise_exception=True)
        except ValidationError as exc:
            print("Labeling structure validation errors:")
            print(json.dumps(serializer.errors, ensure_ascii=False))
            raise exc

        result = serializer.save()
        sections = result['sections']

        out = LabelingSectionSerializer(sections, many=True).data

        return Response(out, status=status.HTTP_200_OK)
        
