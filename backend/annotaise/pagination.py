from collections import OrderedDict

from django.db.models import QuerySet
from rest_framework.pagination import CursorPagination
from rest_framework.response import Response


class StandardCursorPagination(CursorPagination):
    """Paginação por cursor de todas as listagens da API.

    O front consome essas listagens em scroll infinito, então só precisa do
    cursor de `next` para pedir o bloco seguinte. `count` continua no payload
    porque várias telas mostram o total de itens.

    A ordenação default é `-id`: única e monotônica, o que evita o offset de
    desempate do cursor e preserva o "mais recente primeiro" que as listagens
    já usavam.
    """

    page_size = 12
    page_size_query_param = "page_size"
    max_page_size = 100
    ordering = ("-id",)

    def paginate_queryset(self, queryset, request, view=None):
        # Resolvido antes do fatiamento por cursor, senão o total já veio cortado.
        # `list.count` exige argumento, então só QuerySet usa count().
        self.total_count = queryset.count() if isinstance(queryset, QuerySet) else len(queryset)
        return super().paginate_queryset(queryset, request, view)

    def get_paginated_response(self, data):
        return Response(
            OrderedDict([
                ("count", getattr(self, "total_count", None)),
                ("next", self.get_next_link()),
                ("previous", self.get_previous_link()),
                ("results", data),
            ])
        )

    def get_paginated_response_schema(self, schema):
        base = super().get_paginated_response_schema(schema)
        base["required"] = ["count", "results"]
        base["properties"] = OrderedDict(
            [("count", {"type": "integer", "example": 123})] + list(base["properties"].items())
        )
        return base


def paginated_response(view, queryset, serializer_class=None, build_rows=None):
    """Responde uma página por cursor de `queryset`.

    `build_rows` recebe a lista de objetos da página e devolve os dicts que o
    serializer espera. Como só a página corrente passa por ele, agregações
    auxiliares podem ser resolvidas apenas para as linhas exibidas.
    """
    page = view.paginate_queryset(queryset)
    rows = list(queryset) if page is None else page

    if build_rows is not None:
        rows = build_rows(rows)

    serializer_class = serializer_class or view.get_serializer_class()
    serializer = serializer_class(rows, many=True)

    if page is None:
        return Response(serializer.data, status=200)

    return view.get_paginated_response(serializer.data)
