from rest_framework import serializers
from .models import Answer

class AnswerSerializer(serializers.ModelSerializer):
    answer_payload = serializers.DictField()  
    
    class Meta:
        model = Answer
        fields = ['id', 'labeling', 'item', 
                 'answered_by', 'answer_payload', 'created_at']
        read_only_fields = ['id', 'created_at', 'answered_by']
    
    def create(self, validated_data):
        user = self.context["request"].user  # DRF passes request in context
        return super().create({**validated_data, "answered_by": user})