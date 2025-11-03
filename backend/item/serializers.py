from rest_framework import serializers
from .models import Item

class ItemSerializer(serializers.ModelSerializer):
    payload = serializers.DictField()
    
    class Meta:
        model = Item
        fields = ['id', 'labeling', 'payload', 'row_index']
        read_only_fields = ['id']