from django.db.models import Count, IntegerField, QuerySet, Value, F
from django.db.models.functions import Coalesce

class AnswerQuerySet(QuerySet):

    def done_count_by_user(self):
        """(answered_by_id, itens distintos respondidos), a partir do recorte atual."""
        return (
            self.values_list("answered_by_id")
            .annotate(total=Count("item", distinct=True))
            .values_list("answered_by_id", "total")
        )
    def with_item(self):
        return self.select_related("item", "labeling")

    def for_labeling(self, labeling_id):
        return self.filter(labeling_id=labeling_id)
    
    def for_item(self, item_id):
        return self.filter(item_id=item_id)

    def with_dashboard_relations(self):
        return self.select_related("item", "answered_by", "responded_as")

    def answered_by(self, user_id):
        return self.filter(answered_by_id=user_id)
    
    def with_row_index(self):
        return self.annotate(
            row_index=Coalesce(F("item__row_index"), Value(-1), output_field=IntegerField())
        )

    def in_row_order(self):
        return self.order_by("row_index", "id")
    
    def for_export(self):
        return self.select_related("item", "answered_by").with_row_index().in_row_order()
    

class BackgroundAnswerQuerySet(QuerySet):
    def for_labeling(self, labeling_id):
        return self.filter(labeling_id=labeling_id)

    def by_user(self, user_id):
        return self.filter(answered_by_id=user_id)

    def with_author(self):
        return self.select_related("answered_by")