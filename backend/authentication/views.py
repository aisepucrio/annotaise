from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from user.serializers import CustomUserSerializer, CustomUserCreateSerializer
from rest_framework import status
from drf_spectacular.utils import extend_schema

class RegisterAPIView(APIView):

    @extend_schema(
        request=CustomUserCreateSerializer,         # corpo esperado
        responses={201: CustomUserSerializer},      # resposta
        examples=None)
    
    def post(self, request):
        ser = CustomUserCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = ser.save()
        return Response(CustomUserSerializer(user).data, status=status.HTTP_201_CREATED)