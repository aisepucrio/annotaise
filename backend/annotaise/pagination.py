from collections import OrderedDict

from django.db.models import QuerySet
from rest_framework.pagination import CursorPagination
from rest_framework.response import Response


class StandardCursorPagination(CursorPagination):
    """Cursor pagination shared by every listing in the API.

    The frontend consumes these listings via infinite scroll, so it only
    needs the `next` cursor to request the next block. `count` stays in the
    payload because several screens display the total item count.

    Default ordering is `-id`: unique and monotonic, which avoids the
    cursor's tie-break offset and preserves the "most recent first" order
    the listings already relied on.
    """

    page_size = 12
    page_size_query_param = "page_size"
    max_page_size = 100
    ordering = ("-id",)

    def paginate_queryset(self, queryset, request, view=None):
        # Must be resolved before cursor slicing, or the total would already be cut down.
        # `list.count` requires an argument, so only a QuerySet uses count().
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
    """Respond with one cursor page of `queryset`.

    `build_rows` receives the page's list of objects and returns the dicts
    the serializer expects. Since only the current page passes through it,
    auxiliary aggregates only need to be resolved for the rows being shown.
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
