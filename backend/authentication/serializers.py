from rest_framework_simplejwt.serializers import TokenObtainSerializer
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import serializers

User = get_user_model()

class EmailTokenObtainSerializer(TokenObtainSerializer):
   username_field = User.EMAIL_FIELD

class CustomTokenObtainPairSerializer(EmailTokenObtainSerializer):
   @classmethod
   def get_token(cls, user):
       return RefreshToken.for_user(user)

   def validate(self, attrs):
       data = super().validate(attrs)
      
       refresh = self.get_token(self.user)

       data["refresh"] = str(refresh)
       data["access"] = str(refresh.access_token)

       return data

class ForgotPasswordSerializer(serializers.Serializer):
   email = serializers.EmailField()

class ResetPasswordSerializer(serializers.Serializer):
   token = serializers.CharField()
   new_password = serializers.CharField(min_length=3, write_only=True)
