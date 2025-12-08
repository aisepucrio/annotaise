from .models import Labeling, LabelingMembership, LabelingSection
from .serializers import (LabelingSerializer, LabelingMembershipSerializer,
LabelingSectionsBulkCreateSerializer, LabelingSectionSerializer, LabelingDashboardSerializer, LabelingMembershipDashboardSerializer)
from project.models import ProjectMembership
from user.permissions import IsAdminAccount
from .permissions import CanEditLabelingsInProjectPermission

from django.shortcuts import render, get_object_or_404
from django.db import transaction

from rest_framework import viewsets, status

from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from project.models import Project
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q
from drf_spectacular.utils import extend_schema
from datetime import datetime, timedelta
import json

class LabelingViewSet(viewsets.ModelViewSet):
    
    http_method_names = ['get', 'post', 'patch', 'delete']

    def get_serializer_class(self):
        if self.action in ['dashboard','editdashboard']:
            return LabelingDashboardSerializer
        else: return LabelingSerializer
    
    def get_permissions(self):
        if self.action in ['create' ,'list_labeling_memberships']:
            self.permission_classes = [IsAdminAccount]
        elif self.action in ['update','partial_update', 'destroy']:
            self.permission_classes = [IsAdminAccount, CanEditLabelingsInProjectPermission]
        else:
            self.permission_classes = [IsAuthenticated]
        return super().get_permissions()
    
    def get_queryset(self):
        user = getattr(self.request, "user", None)
        if not user or not getattr(user, "is_authenticated", False):
            return Labeling.objects.none()

        qs = (
            Labeling.objects
            .select_related("project")
            .prefetch_related("memberships__user")
            .distinct()
        )
        #rotulações pra todos os casos de usuário
        if (
            getattr(user, "is_staff", False)
            or getattr(user, "is_superuser", False)
            or getattr(user, "account_type", "") == "admin"
        ):
            return qs

        return qs.filter(memberships__user=user)
    
    @action(methods=['get'], detail=False, url_path='dashboard/edit')
    def editdashboard(self, request):
        '''a ideia é que esse dashboard serve pra mostrar o dashboard pro admin, entao tem todos os labelings de todos os projetos
        que o usuario é admin ou owner.'''
        today = datetime.now().date()
        search = request.query_params.get("search")
        output = []
        qs_base = (
            Labeling.objects
            .select_related('project')
            .annotate(
                total_labelings=Count('items', distinct=True),
                done_labelings=Count(
                    'items',
                    filter=Q(items__status='finished'),
                    distinct=True),
            )
        )

        if (
            getattr(request.user, "is_staff", False)
            or getattr(request.user, "is_superuser", False)
            or getattr(request.user, "account_type", "") == "admin"
        ):
            qs = qs_base
        else:
            qs = qs_base.filter(memberships__user=request.user)

        if not qs.exists():
            return Response([], status=200)

        if search:
            qs = qs.filter(
                Q(title__icontains=search) | Q(project__name__icontains=search)
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
            return Response('Erro ao carregar labelings dashboard' + str(ser.error_messages), status=400)
    
    @action(methods=['get'], detail=True, url_path='memberships')
    def list_labeling_memberships(self,request, pk=None):
        labeling = get_object_or_404(Labeling,pk=pk)
        memberships = LabelingMembership.objects.filter(labeling=labeling).select_related('user')

        output = []
        for membership in memberships:
            output.append({
                "id": membership.id,
                "first_name": membership.user.first_name,
                "last_name": membership.user.last_name,
                "email": membership.user.email,
                "role": membership.role,
                "joined_at": membership.joined_at,
            })
        
        ser = LabelingMembershipDashboardSerializer(data=output, many=True)
        
        if ser.is_valid(raise_exception=True):
            return Response(ser.data, status=200)
        else:
            return Response('Erro ao carregar membros da rotulação',ser.errors, status=400)


    @action(methods=['get'], detail=False, url_path='dashboard')
    def dashboard(self, request):
        '''esse é o dashboard normal, que mostra os labelings dos projetos que o usuario participa em respostas. tirei os labelings que ja terminaram
        '''
        today = datetime.now().date()
        search = request.query_params.get("search")
        output = []
        qs = (
            Labeling.objects.filter(memberships__user=request.user)
            .select_related('project')
            .annotate(
                total_labelings=Count('items', distinct=True),
                done_labelings=Count(
                    'items',
                    filter=Q(items__status='finished'),
                    distinct=True),
            ).filter(items__status__in=['pending','in_progress'])
        )
        if search:
            qs = qs.filter(
                Q(title__icontains=search) | Q(project__name__icontains=search)
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
    
    def perform_create(self, serializer):
        user = self.request.user

        perm = CanEditLabelingsInProjectPermission()
        
        if perm.can_edit_labeling_by_project(user,self.request.data.get('project')) == False:
            raise PermissionDenied(detail=perm.message)
        labeling = serializer.save(created_by=user)

        return super().perform_create(serializer)


class LabelingMembershipViewSet(viewsets.ModelViewSet):
    serializer_class = LabelingMembershipSerializer
    permission_classes = [IsAdminAccount, CanEditLabelingsInProjectPermission]
    queryset = LabelingMembership.objects.select_related('labeling', 'user')
    http_method_names = ['get', 'post', 'patch', 'delete']

    
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

    def get_permissions(self):
        if self.request.method in ['GET']:# TODO isso aqui tem que ser retirado mas acho que vai quebrar o frontend
            return [IsAuthenticated()]
        return [IsAdminAccount()]

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

        perm = CanEditLabelingsInProjectPermission()
        if not perm.can_edit_labeling(request.user, labeling_id):
            raise PermissionDenied(detail=perm.message)
        

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
        
