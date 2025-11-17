from django.shortcuts import render, get_object_or_404
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from labeling.models import Labeling, LabelingMembership
import pandas as pd
from .serializers import UploadItemCSVSerializer, ItemSerializer
from drf_spectacular.utils import extend_schema, OpenApiResponse
from rest_framework.parsers import MultiPartParser
from .models import Item

class ListItemsView(ListAPIView):
    serializer_class = ItemSerializer

    def get_queryset(self):
        labeling_id = self.kwargs.get("labeling_id")
        return Item.objects.filter(labeling_id=labeling_id).distinct()

    def list(self, request, *args, **kwargs):
        labeling_id = kwargs.get("labeling_id")

        if not LabelingMembership.objects.filter(
            labeling_id=labeling_id,
            user=request.user
        ).exists():
            return Response(
                {"detail": "Você não tem acesso a essa rotulação"},
                status=401
            )
        return super().list(request, *args, **kwargs)



class ImportItemsCsvView(APIView):

    parser_classes = (MultiPartParser,)
    @extend_schema(
        request=UploadItemCSVSerializer,
        responses={
            200: OpenApiResponse(description="Arquivo CSV recebido com sucesso"),
            400: OpenApiResponse(description="Erro na validação ou no arquivo enviado"),
        },
    )
    def post(self, request, labeling_id):
        
        serializer = UploadItemCSVSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        labeling = get_object_or_404(Labeling, id=labeling_id)

        uploaded_file = serializer.validated_data['file']

        if uploaded_file is None:
            return Response({"detail": "Nenhum arquivo enviado"}, status=400)

        if not getattr(uploaded_file, "name", "").lower().endswith(".csv"):
            return Response({"detail": "O arquivo deve ser .csv"}, status=400)
        
        df = pd.read_csv(uploaded_file)
        
        cols = df.columns
        print(cols)


        labeling.column_names = list(cols)
        labeling.save()

        items = []

        for idx, row in df.iterrows():
            items.append(
                Item(
                    labeling=labeling,
                    row_index=idx,
                    payload=row.to_dict(),
                    status="pending",
                )
            )

        Item.objects.bulk_create(items)
        
        return Response({"detail": "Arquivo recebido"}, status=200)
