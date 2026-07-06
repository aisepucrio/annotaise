from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardPageNumberPagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = "page_size"
    max_page_size = 100


def paginated_response(view, data, serializer_class=None):
    page = view.paginate_queryset(data)
    serializer_class = serializer_class or view.get_serializer_class()
    serializer = serializer_class(page if page is not None else data, many=True)

    if page is not None:
        return view.get_paginated_response(serializer.data)

    return Response(serializer.data, status=200)
