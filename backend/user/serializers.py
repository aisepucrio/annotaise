from rest_framework import serializers
from .models import CustomUser
from django.contrib.auth import get_user_model


class CustomUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'date_joined']
        read_only_fields = ['id', 'date_joined']

class CustomUserCreateSerializer(serializers.ModelSerializer):
    '''Esse serializer é usado para criar novos usuários. não usar em nenhum outro contexto porque a senha ficará exposta.'''
    class Meta:
        model = CustomUser
        fields = ['username', 'email', 'first_name', 'last_name', 'password']
        write_only_fields = ['password']

    def create(self, validated_data):
        user = CustomUser.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            password=validated_data['password']
        )
        return user


User = get_user_model()

class AdminUserReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "is_active", "is_staff", "date_joined"]

class AdminUserWriteSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ["username", "email", "first_name", "last_name", "is_active", "is_staff", "password"]

    def create(self, validated_data):
        pwd = validated_data.pop("password", None)
        user = User.objects.create_user(**validated_data)
        if pwd:
            user.set_password(pwd); user.save()
        return user

    def update(self, instance, validated_data):
        pwd = validated_data.pop("password", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        if pwd:
            instance.set_password(pwd)
        instance.save()
        return instance
