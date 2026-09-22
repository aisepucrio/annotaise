from django.db.models import Count, OuterRef, QuerySet, Subquery, IntegerField
from django.db.models.functions import Coalesce


class UserQuerySet(QuerySet):

    def user_dashboard_qs(self): 
        #a way to stop circular import. Open to changes
        from project.models import ProjectMembership
        from labeling.models import LabelingMembership
        from answer.models import Answer
        from item.models import ItemMembership

        projects = (
            ProjectMembership.objects.filter(user=OuterRef("pk"))
            .order_by()
            .values("user")
            .annotate(c=Count("id"))
            .values("c")
        )
        labelings = (
            LabelingMembership.objects.filter(user=OuterRef("pk"))
            .order_by()
            .values("user")
            .annotate(c=Count("id"))
            .values("c")
        )
        answers = (
            Answer.objects.filter(answered_by=OuterRef("pk"))
            .order_by()
            .values("answered_by")
            .annotate(c=Count("id"))
            .values("c")
        )
        #trocando de views.py para querysets pois precisaremos no return
        pending_items = ItemMembership.objects.filter(
            item__labeling__memberships__user_id=OuterRef('id'),
            user_id=OuterRef('id')  # memberships do próprio usuário
        ).values('user_id').annotate(
            count=Count('id', distinct=True)
        ).values('count')
    

        return self.annotate(
            projects_count=Coalesce(Subquery(projects, output_field=IntegerField()), 0),
            labelings_total=Coalesce(Subquery(labelings, output_field=IntegerField()), 0),
            answers_count=Coalesce(Subquery(answers, output_field=IntegerField()), 0),
            pending_items_count=(Subquery(pending_items, output_field=IntegerField()), 0),
        )
    
    def user_email(self, email):
        return(
            self.filter(email__iexact = (email or "").strip().lower()) )
    
        