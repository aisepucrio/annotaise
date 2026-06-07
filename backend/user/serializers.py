from rest_framework import serializers
from .models import CustomUser, UserGroup, UserGroupMembership
from django.contrib.auth import get_user_model
import uuid
from .models import Invitation


'''o username a princípio será o email do usuário, mas o campo username é obrigatório no modelo padrão do django, 
então ele permanece e vai ser um id aleatorio.'''
class CustomUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "date_joined",
            "account_type",
            "onboarding_status",
            "is_staff",
        ]
        read_only_fields = ["id", "date_joined", "is_staff"]

class CustomUserCreateSerializer(serializers.ModelSerializer):
    '''Esse serializer é usado para criar novos usuários. não usar em nenhum outro contexto porque a senha ficará exposta.'''
    class Meta:
        model = CustomUser
        fields = ['email', 'first_name', 'last_name', 'password']
        write_only_fields = ['password']



    def create(self, validated_data):

        user_id = uuid.uuid4()          
        user_id_str = user_id.hex
        user = CustomUser.objects.create_user(
            username=user_id_str,
            email=validated_data['email'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            password=validated_data['password']
        )
        return user


User = get_user_model()

class AdminUserReadSerializer(serializers.ModelSerializer):
    projects_count = serializers.IntegerField(read_only=True)
    labelings_total = serializers.IntegerField(read_only=True)
    answers_count = serializers.IntegerField(read_only=True)
    pending_items_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "is_active",
            "is_staff",
            "account_type",
            "onboarding_status",
            "date_joined",
            "projects_count",
            "labelings_total",
            "answers_count",
            "pending_items_count",
        ]

class AdminUserWriteSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "first_name",
            "last_name",
            "is_active",
            "account_type",
            "password",
        ]

    def create(self, validated_data):
        account_type = validated_data.get("account_type")

        pwd = validated_data.pop("password", None)
        user = User.objects.create_user(**validated_data)
        if pwd:
            user.set_password(pwd); user.save()
        return user

    def update(self, instance, validated_data):
        account_type = validated_data.get("account_type")

        pwd = validated_data.pop("password", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        if pwd:
            instance.set_password(pwd)
        instance.save()
        return instance

class InvitationSerializer(serializers.ModelSerializer):
    invited_by_email = serializers.EmailField(
        source="invited_by.email", read_only=True
    )
    is_expired = serializers.SerializerMethodField()
    project_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        write_only=True,
    )
    labeling_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        write_only=True,
    )

    class Meta:
        model = Invitation
        fields = [
            "token",
            "email",
            "role",
            "created_at",
            "expires_at",
            "is_used",
            "is_expired",
            "invited_by",
            "invited_by_email",
            "user",
            "project_ids",
            "labeling_ids",
        ]
        read_only_fields = [
            "token",
            "created_at",
            "is_used",
            "invited_by",
            "invited_by_email",
            "expires_at",
            "is_expired",
            "user",
        ]

    def get_is_expired(self, obj: Invitation) -> bool:
        return obj.is_expired

    def create(self, validated_data):
        validated_data.pop("project_ids", None)
        validated_data.pop("labeling_ids", None)
        invited_by = validated_data.pop(
            "invited_by", getattr(self.context.get("request"), "user", None)
        )
        return Invitation.objects.create(**validated_data, invited_by=invited_by)

class UserGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserGroup
        fields = ['id', 'name', 'description', 'created_by']
        read_only_fields = ['id', 'created_by']
    def create(self, validated_data):
        user = self.context.get("request").user
        return UserGroup.objects.create(created_by=user, **validated_data)


class UserGroupMembershipSerializer(serializers.ModelSerializer):

    class Meta:
        model = UserGroupMembership
        fields = ['id', 'user', 'group', 'joined_at']
        read_only_fields = ['id']