from rest_framework import serializers
from .models import Labeling, LabelingSection, LabelingElement, MultipleChoiceItem, QuestionRange, LabelingMembership
from django.db import transaction
from django.utils import timezone


class LabelingSerializer(serializers.ModelSerializer):

    class Meta:
        model = Labeling
        fields = ['id', 'project', 'title', 'created_at','status','column_names','start_date','final_date','users_per_item','block_section_back','guide','decision']
        read_only_fields = ['id', 'created_at','created_by','column_names','status']

    def create(self, validated_data):
        if not validated_data.get("start_date"):
            validated_data["start_date"] = timezone.now().date()
        return super().create(validated_data)

    def update (self, instance, validated_data):
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
            "allow_multiple",
            "multiple_choice_items",
            "question_range",
            "context_type",
            "decisive_question"
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
    id = serializers.IntegerField(required=False)
    class Meta:
        model = MultipleChoiceItem
        fields = ['id', 'text', 'value', 'order']
        read_only_fields = []


class QuestionRangeWriteSerializer(serializers.ModelSerializer):
    """
    Usado dentro do elemento. Não expõe labeling_element, pois vem do pai.
    """
    id = serializers.IntegerField(required=False)
    class Meta:
        model = QuestionRange
        fields = ['id', 'start', 'end', 'step']
        read_only_fields = []
    def validate(self, attrs):
        if(attrs['start'] >= attrs['end']):
            raise serializers.ValidationError({'detail':'o campo start deve ser menor que end'})
        return super().validate(attrs)


# ---------- ELEMENTO (pergunta / texto / etc) ----------

class LabelingElementWriteSerializer(serializers.ModelSerializer):
    """
    Elemento com os filhos (multiple_choice_items e question_range).
    """
    id = serializers.IntegerField(required=False)
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
            'context_type',
            'allow_multiple',
            'multiple_choice_items',
            'question_range',
        ]
        read_only_fields = []


# ---------- SEÇÃO ----------

class LabelingSectionWriteSerializer(serializers.ModelSerializer):
    """
    Seção como lista de elementos.
    """
    id = serializers.IntegerField(required=False)
    elements = LabelingElementWriteSerializer(many=True)

    class Meta:
        model = LabelingSection
        fields = ['id', 'title', 'order', 'elements']
        read_only_fields = []
    def validate(self, attrs):
        return super().validate(attrs)

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

class LabelingMembershipDashboardSerializer(serializers.Serializer):
    id = serializers.IntegerField()

    first_name = serializers.CharField(allow_blank=True, allow_null=True)
    last_name = serializers.CharField(allow_blank=True, allow_null=True)
    email = serializers.EmailField()
    role = serializers.CharField()

    joined_at = serializers.DateTimeField()
