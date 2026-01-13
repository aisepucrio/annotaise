from rest_framework import serializers
from .models import Item
from labeling.serializers import LabelingSectionSerializer

class ItemSerializer(serializers.ModelSerializer):
    payload = serializers.DictField()
    
    class Meta:
        model = Item
        fields = ['id', 'labeling', 'payload', 'row_index','status', 'decision_payload']
        read_only_fields = ['id']


class UploadItemCSVSerializer(serializers.Serializer):
    file = serializers.FileField()

class NextItemResponseSerializer(serializers.Serializer):
    sections = LabelingSectionSerializer(source='labeling.sections', many=True, read_only=True)
    # source='*' ensures the whole Item instance is passed to the nested serializer
    item = ItemSerializer(source='*', read_only=True)
