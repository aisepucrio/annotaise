from rest_framework import serializers
from .models import CustomUser
from django.contrib.auth import get_user_model
import uuid


'''o username a princípio será o email do usuário, mas o campo username é obrigatório no modelo padrão do django, 
então ele permanece e vai ser um id aleatorio.'''
class CustomUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ["id", "email", "first_name", "last_name", "date_joined", "account_type", "is_staff"]
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
            "is_staff",
            "account_type",
            "password",
        ]

    def create(self, validated_data):
        account_type = validated_data.get("account_type")
        if account_type == getattr(User.accountType, "ADMIN", "admin"):
            validated_data["is_staff"] = True

        pwd = validated_data.pop("password", None)
        user = User.objects.create_user(**validated_data)
        if pwd:
            user.set_password(pwd); user.save()
        return user

    def update(self, instance, validated_data):
        account_type = validated_data.get("account_type")
        if account_type == getattr(User.accountType, "ADMIN", "admin"):
            validated_data.setdefault("is_staff", True)

        pwd = validated_data.pop("password", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        if pwd:
            instance.set_password(pwd)
        instance.save()
        return instance
