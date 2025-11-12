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