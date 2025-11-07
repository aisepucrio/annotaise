from rest_framework import serializers
from .models import Labeling, LabelingSection, LabelingElement, MultipleChoiceItem, QuestionRange, LabelingMembership


class LabelingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Labeling
        fields = ['id', 'project', 'title', 'created_by', 'created_at']
        read_only_fields = ['id', 'created_at']

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
        read_only_fields = ['id', 'joined_at']