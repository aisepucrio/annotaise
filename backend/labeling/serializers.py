from rest_framework import serializers
from .models import Labeling, LabelingSection, LabelingElement, MultipleChoiceItem, QuestionRange, LabelingMembership
from django.db import transaction


class LabelingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Labeling
        fields = ['id', 'project', 'title', 'created_at','status','column_names','start_date','final_date']
        read_only_fields = ['id', 'created_at','created_by','column_names']

    def update (self, instance, validated_data):
        # bloqueia a troca de projeto
        if "project" in validated_data and validated_data["project"].id != instance.project_id:
            raise serializers.ValidationError({
                "project": "Você não pode alterar o projeto de uma rotulação existente, crie outra."
            })
        
        return super().update(instance, validated_data)
      
class MultipleChoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MultipleChoiceItem
        fields = ["id", "text", "value", "order"]

class QuestionRangeSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionRange
        fields = ["id", "start", "end", "step"]  # idem

class LabelingElementSerializer(serializers.ModelSerializer):
    multiple_choice_items = MultipleChoiceItemSerializer(many=True, read_only=True)
    question_range = QuestionRangeSerializer(read_only=True)

    class Meta:
        model = LabelingElement
        fields = [
            "id",
            "order",
            "text",
            "required",
            "question_type",
            "column_name",
            "multiple_choice_items",
            "question_range",
        ]

class LabelingSectionSerializer(serializers.ModelSerializer):
    elements = LabelingElementSerializer(many=True, read_only=True)

    class Meta:
        model = LabelingSection
        fields = ["id", "title", "order", "elements"]
        

class LabelingMembershipSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabelingMembership
        fields = ['id', 'user', 'labeling', 'items_done', 'role', 'joined_at']
        read_only_fields = ['id', 'joined_at','items_done']

    def update(self, instance, validated_data):
        # bloqueia a troca de rotulação
        if "labeling" in validated_data and validated_data["labeling"].id != instance.labeling_id:
            raise serializers.ValidationError({
                "project": "Você não pode alterar a rotulação de uma relação existente, crie outra."
            })

        # bloqueia mudança de dono
        if "created_by" in validated_data and validated_data["created_by"].id != instance.created_by_id:
            raise serializers.ValidationError({
                "created_by": "Você não pode trocar o dono da relacao."
            })
        

        return super().update(instance, validated_data)


# ---------- SERIALIZERS DE ESCRITA ----------

class MultipleChoiceItemWriteSerializer(serializers.ModelSerializer):
    """
    Usado dentro do elemento. Não expõe labeling_element, pois vem do pai.
    """
    class Meta:
        model = MultipleChoiceItem
        fields = ['id', 'text', 'value', 'order']
        read_only_fields = ['id']


class QuestionRangeWriteSerializer(serializers.ModelSerializer):
    """
    Usado dentro do elemento. Não expõe labeling_element, pois vem do pai.
    """
    class Meta:
        model = QuestionRange
        fields = ['id', 'start', 'end', 'step']
        read_only_fields = ['id']
    def validate(self, attrs):
        if(attrs['start'] >= attrs['end']):
            raise serializers.ValidationError({'detail':'o campo start deve ser menor que end'})
        return super().validate(attrs)


# ---------- ELEMENTO (pergunta / texto / etc) ----------

class LabelingElementWriteSerializer(serializers.ModelSerializer):
    """
    Elemento com os filhos (multiple_choice_items e question_range).
    """
    multiple_choice_items = MultipleChoiceItemWriteSerializer(
        many=True, required=False
    )
    question_range = QuestionRangeWriteSerializer(
        required=False, allow_null=True
    )

    class Meta:
        model = LabelingElement
        
        fields = [
            'id',
            'order',
            'text',
            'required',
            'question_type',
            'column_name',
            'multiple_choice_items',
            'question_range',
        ]
        read_only_fields = ['id']


# ---------- SEÇÃO ----------

class LabelingSectionWriteSerializer(serializers.ModelSerializer):
    """
    Seção como lista de elementos.
    """
    elements = LabelingElementWriteSerializer(many=True)

    class Meta:
        model = LabelingSection
        fields = ['id', 'title', 'order', 'elements']
        read_only_fields = ['id']


# ---------- LABELING FORM COMPLETO ----------

class LabelingSectionsBulkCreateSerializer(serializers.Serializer):
    """
    Recebe somente as sections e cria tudo em um Labeling EXISTENTE.
    O labeling vem de self.context['labeling'], passado pela View.
    """
    sections = LabelingSectionWriteSerializer(many=True)

    @transaction.atomic
    def create(self, validated_data):
        labeling = self.context['labeling']   # deve estar setado na view
        sections_data = validated_data.get('sections', [])

        created_sections = []

        for section_data in sections_data:
            elements_data = section_data.pop('elements', [])
            section = LabelingSection.objects.create(
                labeling=labeling,
                **section_data,
            )
            created_sections.append(section)

            for element_data in elements_data:
                mc_items_data = element_data.pop('multiple_choice_items', [])
                range_data = element_data.pop('question_range', None)

                element = LabelingElement.objects.create(
                    labeling_section=section,
                    **element_data,
                )

                for item_data in mc_items_data:
                    MultipleChoiceItem.objects.create(
                        labeling_element=element,
                        **item_data,
                    )

                if range_data is not None:
                    QuestionRange.objects.create(
                        labeling_element=element,
                        **range_data,
                    )
        return {
            "sections": created_sections,
        }

class LabelingDashboardSerializer(serializers.Serializer):
    id = serializers.IntegerField()

    labeling_name = serializers.CharField()
    project_name = serializers.CharField()
    total_days = serializers.IntegerField()
    days_passed = serializers.IntegerField()

    items_done = serializers.IntegerField()
    total_items = serializers.IntegerField()
#TODO validações individuais de cada serializer, pra não cair em internal server error