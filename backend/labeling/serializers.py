from rest_framework import serializers
from .models import Labeling, LabelingSection, LabelingElement, MultipleChoiceItem, QuestionRange, LabelingMembership


class LabelingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Labeling
        fields = ['id', 'project', 'title', 'created_at','status','column_names']
        read_only_fields = ['id', 'created_at','created_by','column_names']

    def update (self, instance, validated_data):
        # bloqueia a troca de projeto
        if "project" in validated_data and validated_data["project"].id != instance.project_id:
            raise serializers.ValidationError({
                "project": "Você não pode alterar o projeto de uma rotulação existente, crie outra."
            })
        
        return super().update(instance, validated_data)
      
class LabelingSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabelingSection
        fields = ['id', 'labeling', 'title', 'order']
        read_only_fields = ['id']

class LabelingElementSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabelingElement
        fields = ['id', 'labeling_section', 'order', 'text', 'required', 'question_type', 'column_name']
        read_only_fields = ['id']

class MultipleChoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MultipleChoiceItem
        fields = ['id', 'labeling_element', 'text', 'value', 'order']
        read_only_fields = ['id']

class QuestionRangeSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionRange
        fields = ['id', 'labeling_element', 'start', 'end', 'step']
        read_only_fields = ['id']

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