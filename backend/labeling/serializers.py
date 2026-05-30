import uuid

from rest_framework import serializers
from .models import Labeling, LabelingSection, LabelingElement, MultipleChoiceItem, QuestionRange, LabelingMembership
from django.db import transaction
from django.utils import timezone

LLM_TIEBREAK_USERNAME = "llm_tiebreak_bot"
LLM_TIEBREAK_EMAIL = "llm_tiebreak_bot@annotaise.local"


class LabelingSerializer(serializers.ModelSerializer):
    anonymous_url = serializers.ReadOnlyField()

    class Meta:
        model = Labeling
        fields = ['id', 'project', 'title', 'created_at','status','column_names','start_date','final_date','users_per_item','block_section_back','has_background_form','guide','decision','decision_mode','decisive_question','distribution_strategy','form_mode','anonymous_token','anonymous_url']
        read_only_fields = ['id', 'created_at','created_by','column_names','status','anonymous_token','anonymous_url']

    def create(self, validated_data):
        if not validated_data.get("start_date"):
            validated_data["start_date"] = timezone.now().date()
        # Anonymous mode needs a stable token so a shareable URL can be generated.
        if validated_data.get("distribution_strategy") == Labeling.DistributionStrategy.ANONYMOUS_MODE:
            validated_data["anonymous_token"] = uuid.uuid4()
        labeling = super().create(validated_data)
        if labeling.form_mode:
            from item.models import Item
            Item.objects.create(
                labeling=labeling,
                payload={},
                row_index=0,
                status="pending",
            )
        return labeling

    def update (self, instance, validated_data):
        # Lazily mint a token the first time a labeling is moved into anonymous mode.
        strategy = validated_data.get("distribution_strategy", instance.distribution_strategy)
        if strategy == Labeling.DistributionStrategy.ANONYMOUS_MODE and not instance.anonymous_token:
            validated_data["anonymous_token"] = uuid.uuid4()
        return super().update(instance, validated_data)
      
class MultipleChoiceItemSerializer(serializers.ModelSerializer):
    follow_up_question = serializers.SerializerMethodField()

    class Meta:
        model = MultipleChoiceItem
        fields = ["id", "text", "value", "order", "follow_up_question"]

    def get_follow_up_question(self, obj):
        if obj.follow_up_question is None or self.context.get('_no_followup'):
            return None
        return LabelingElementSerializer(
            obj.follow_up_question,
            context={**self.context, '_no_followup': True},
        ).data

class QuestionRangeSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionRange
        fields = ["id", "start", "end", "start_label", "end_label"]
    
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
        ]

class LabelingSectionSerializer(serializers.ModelSerializer):
    elements = serializers.SerializerMethodField()

    class Meta:
        model = LabelingSection
        fields = ["id", "title", "order", "elements"]

    def get_elements(self, obj):
        follow_up_ids = set(
            MultipleChoiceItem.objects.filter(
                labeling_element__labeling_section=obj,
                follow_up_question__isnull=False,
            ).values_list("follow_up_question_id", flat=True)
        )
        elements = obj.elements.exclude(id__in=follow_up_ids)
        return LabelingElementSerializer(elements, many=True, context=self.context).data
        

class LabelingMembershipSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabelingMembership
        fields = ['id', 'user', 'labeling', 'items_done', 'role', 'joined_at']
        read_only_fields = ['id', 'joined_at','items_done']

    def validate_user(self, user):
        username = (getattr(user, "username", "") or "").strip().lower()
        email = (getattr(user, "email", "") or "").strip().lower()
        if username == LLM_TIEBREAK_USERNAME or email == LLM_TIEBREAK_EMAIL:
            raise serializers.ValidationError(
                "Este usuário técnico não pode ser adicionado como membro de rotulação."
            )
        return user

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

class QuestionRangeWriteSerializer(serializers.ModelSerializer):
    """
    Usado dentro do elemento. Não expõe labeling_element, pois vem do pai.
    """
    id = serializers.IntegerField(required=False)
    class Meta:
        model = QuestionRange
        fields = ['id', 'start', 'end', 'start_label', 'end_label']
        read_only_fields = []
    def validate(self, attrs):
        if(attrs['start'] >= attrs['end']):
            raise serializers.ValidationError({'detail':'o campo start deve ser menor que end'})
        return super().validate(attrs)


class MultipleChoiceItemWriteSerializer(serializers.ModelSerializer):
    """
    Usado dentro do elemento. Não expõe labeling_element, pois vem do pai.
    follow_up_question é definido no __init__ para evitar referência circular.
    """
    id = serializers.IntegerField(required=False)

    class Meta:
        model = MultipleChoiceItem
        fields = ['id', 'text', 'value', 'order', 'follow_up_question']
        read_only_fields = []

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if '_no_followup' not in self.context:
            self.fields['follow_up_question'] = FollowUpElementWriteSerializer(
                required=False, allow_null=True
            )
        else:
            self.fields.pop('follow_up_question', None)


class FollowUpElementWriteSerializer(serializers.ModelSerializer):
    """
    Versão do LabelingElementWriteSerializer para follow-up questions.
    Limita a um nível de profundidade (sem follow-ups aninhados).
    """
    id = serializers.IntegerField(required=False)
    multiple_choice_items = None  # será sobrescrito no __init__
    question_range = QuestionRangeWriteSerializer(required=False, allow_null=True)

    class Meta:
        model = LabelingElement
        fields = [
            'id', 'order', 'text', 'required', 'question_type',
            'column_name', 'context_type', 'allow_multiple',
            'multiple_choice_items', 'question_range',
        ]
        read_only_fields = []

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['multiple_choice_items'] = MultipleChoiceItemWriteSerializer(
            many=True, required=False,
            context={'_no_followup': True},
        )


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

            follow_up_order_counter = 10000

            for element_data in elements_data:
                mc_items_data = element_data.pop('multiple_choice_items', [])
                range_data = element_data.pop('question_range', None)

                element = LabelingElement.objects.create(
                    labeling_section=section,
                    **element_data,
                )

                for item_data in mc_items_data:
                    follow_up_data = item_data.pop('follow_up_question', None)
                    follow_up_element = None

                    if follow_up_data:
                        follow_up_data.pop('id', None)
                        follow_up_data.pop('order', None)
                        fu_mc_items = follow_up_data.pop('multiple_choice_items', [])
                        fu_range = follow_up_data.pop('question_range', None)
                        follow_up_order_counter += 1
                        follow_up_element = LabelingElement.objects.create(
                            labeling_section=section,
                            order=follow_up_order_counter,
                            **follow_up_data,
                        )
                        for fu_item in fu_mc_items:
                            MultipleChoiceItem.objects.create(
                                labeling_element=follow_up_element,
                                **fu_item,
                            )
                        if fu_range is not None:
                            QuestionRange.objects.create(
                                labeling_element=follow_up_element,
                                **fu_range,
                            )

                    MultipleChoiceItem.objects.create(
                        labeling_element=element,
                        follow_up_question=follow_up_element,
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
    total_items = serializers.IntegerField(required=False, allow_null=True)
    background_required = serializers.BooleanField(required=False)
    background_answered = serializers.BooleanField(required=False)
    form_mode = serializers.BooleanField(required=False)
    answers_collected = serializers.IntegerField(required=False, allow_null=True)
#TODO validações individuais de cada serializer, pra não cair em internal server error

class LabelingMembershipDashboardSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    user = serializers.IntegerField()

    first_name = serializers.CharField(allow_blank=True, allow_null=True)
    last_name = serializers.CharField(allow_blank=True, allow_null=True)
    email = serializers.EmailField()
    role = serializers.CharField()
    background_answered = serializers.BooleanField(required=False)

    joined_at = serializers.DateTimeField()


class LabelingAgreementOptionSerializer(serializers.Serializer):
    key = serializers.CharField()
    label = serializers.CharField()
    agreement_count = serializers.IntegerField(min_value=0)


class LabelingAgreementQuestionSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    possible_agreements = serializers.IntegerField(min_value=0)
    options = LabelingAgreementOptionSerializer(many=True)


class LabelingAgreementSummarySerializer(serializers.Serializer):
    min_agreement = serializers.IntegerField(min_value=2)
    max_min_agreement = serializers.IntegerField(min_value=2)
    questions = LabelingAgreementQuestionSerializer(many=True)
