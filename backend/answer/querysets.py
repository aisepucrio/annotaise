from django.db.models import Count, QuerySet


class AnswerQuerySet(QuerySet):

    def done_count_by_user(self):
        """(answered_by_id, itens distintos respondidos), a partir do recorte atual."""
        return (
            self.values_list("answered_by_id")
            .annotate(total=Count("item", distinct=True))
            .values_list("answered_by_id", "total")
        )
