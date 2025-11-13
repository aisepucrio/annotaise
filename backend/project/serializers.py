from rest_framework import serializers
from .models import Project, ProjectMembership

class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ['id', 'name', 'description', 'status', 'created_at','created_by']
        read_only_fields = ['id', 'created_at', 'created_by']

class ProjectMembershipSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectMembership
        fields = ['id', 'role', 'project', 'user', 'joined_at']
        read_only_fields = ['id', 'joined_at']
    def update (self, instance, validated_data):
        # bloqueia a troca de projeto
        if "project" in validated_data and validated_data["project"].id != instance.project_id:
            raise serializers.ValidationError({
                "project": "Você não pode alterar o projeto de uma relação existente, crie outra."
            })
        
        # bloqueia a troca de usuário
        if "user" in validated_data and validated_data["user"].id != instance.user_id:
            raise serializers.ValidationError({
                "project": "Você não pode alterar o usuário de uma relação existente, crie outra."
            })
        
        return super().update(instance, validated_data)