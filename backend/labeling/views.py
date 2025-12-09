from .models import Labeling, LabelingMembership, LabelingSection, LabelingElement, MultipleChoiceItem, QuestionRange
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
        user = self.request.user

        return (
            Labeling.objects
            .filter(
                Q(project__memberships__user=user) |
                Q(memberships__user=user)
            )
            .distinct()
        )

    
    @action(methods=['get'], detail=False, url_path='dashboard/edit')
    def editdashboard(self, request):
        '''a ideia é que esse dashboard serve pra mostrar o dashboard pro admin, entao tem todos os labelings de todos os projetos
        que o usuario é admin ou owner.'''
        today = datetime.now().date()
        search = request.query_params.get("search")
        output = []
        qs = (Labeling.objects.filter(project__memberships__user=request.user)
            .select_related('project')
            .annotate(
                total_labelings=Count('items', distinct=True),
                done_labelings=Count(
                    'items',
                    filter=Q(items__status='finished'),
                    distinct=True),
            )
        )
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

        sections_data = serializer.validated_data.get("sections", [])

        existing_sections_qs = LabelingSection.objects.filter(labeling=labeling).prefetch_related(
            "elements__multiple_choice_items", "elements__question_range"
        )
        existing_sections = {sec.id: sec for sec in existing_sections_qs}
        sections_to_keep = set()
        created_sections = []

        # Libera as ordens atuais para evitar colisão de constraint
        # usa um deslocamento pequeno para liberar ordens sem estourar smallint
        temp_offset = 1000
        for idx, sec in enumerate(existing_sections_qs):
            sec.order = temp_offset + idx
            sec.save(update_fields=["order"])
            # idem para elementos da seção
            for el_idx, el in enumerate(sec.elements.all()):
                el.order = temp_offset + el_idx
                el.save(update_fields=["order"])

        for idx, section_data in enumerate(sections_data):
            elements_data = section_data.pop("elements", [])
            section_id = section_data.pop("id", None)
            section_data.pop("order", None)  # evitar passagem duplicada de order
            section_order = idx + 1  # 1-based sequencial para manter compatibilidade com expectativas

            if section_id and section_id in existing_sections:
                section = existing_sections[section_id]
                for attr, value in section_data.items():
                    setattr(section, attr, value)
                section.order = section_order
                section.save()
            else:
                section = LabelingSection.objects.create(
                    labeling=labeling,
                    order=section_order,
                    **section_data
                )
            sections_to_keep.add(section.id)
            created_sections.append(section)

            existing_elements = {el.id: el for el in section.elements.all()}
            elements_to_keep = set()

            for element_idx, element_data in enumerate(elements_data):
                mc_items_data = element_data.pop("multiple_choice_items", [])
                range_data = element_data.pop("question_range", None)
                element_id = element_data.pop("id", None)
                element_data.pop("order", None)  # evitar duplicação
                element_order = element_idx + 1  # idem: 1-based sequencial

                if element_id and element_id in existing_elements:
                    element = existing_elements[element_id]
                    for attr, value in element_data.items():
                        setattr(element, attr, value)
                    element.order = element_order
                    element.save()
                else:
                    element = LabelingElement.objects.create(
                        labeling_section=section,
                        order=element_order,
                        **element_data
                    )
                elements_to_keep.add(element.id)

                # atualiza range
                if range_data is not None:
                    if hasattr(element, "question_range"):
                        for attr, value in range_data.items():
                            setattr(element.question_range, attr, value)
                        element.question_range.save()
                    else:
                        QuestionRange.objects.create(labeling_element=element, **range_data)
                else:
                    if hasattr(element, "question_range"):
                        element.question_range.delete()

                # ressincroniza múltipla escolha recriando (simplifica)
                element.multiple_choice_items.all().delete()
                for item_data in mc_items_data:
                    MultipleChoiceItem.objects.create(labeling_element=element, **item_data)

            # remove elementos não enviados
            to_delete_elements = [el_id for el_id in existing_elements.keys() if el_id not in elements_to_keep]
            if to_delete_elements:
                LabelingElement.objects.filter(id__in=to_delete_elements).delete()

        # remove seções não enviadas
        to_delete_sections = [sec_id for sec_id in existing_sections.keys() if sec_id not in sections_to_keep]
        if to_delete_sections:
            LabelingSection.objects.filter(id__in=to_delete_sections).delete()

        out = LabelingSectionSerializer(created_sections, many=True).data

        return Response(out, status=status.HTTP_200_OK)
        
