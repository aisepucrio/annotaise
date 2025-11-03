from rest_framework import serializers
from .models import Answer

class AnswerSerializer(serializers.ModelSerializer):
    answer_payload = serializers.DictField()  
    
    class Meta:
        model = Answer
        fields = ['id', 'labeling', 'item', 'labeling_question', 
                 'answered_by', 'answer_payload', 'created_at']
        read_only_fields = ['id', 'created_at']