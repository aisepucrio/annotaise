from rest_framework import serializers
from .models import Item
from labeling.serializers import LabelingSectionSerializer
from labeling.models import LabelingSection

class ItemSerializer(serializers.ModelSerializer):
    payload = serializers.DictField()
    
    class Meta:
        model = Item
        fields = [
            'id',
            'labeling',
            'payload',
            'row_index',
            'status',
            'decision_payload',
            'llm_tiebreak_attempted',
            'llm_tiebreak_result',
            'final_decision_source',
            'final_decision_value',
        ]
        read_only_fields = ['id']


class UploadItemCSVSerializer(serializers.Serializer):
    file = serializers.FileField()

class NextItemResponseSerializer(serializers.Serializer):
    sections = serializers.SerializerMethodField()
    item = ItemSerializer(source='*', read_only=True)
    form_mode = serializers.BooleanField(source='labeling.form_mode', read_only=True)
    guide = serializers.CharField(source='labeling.guide', read_only=True)

    def get_sections(self, item):
        sections = item.labeling.sections.filter(form_type=LabelingSection.FormType.MAIN)
        return LabelingSectionSerializer(sections, many=True).data
