from django.db.models import Count, OuterRef, QuerySet, Subquery, IntegerField
from django.db.models.functions import Coalesce
from project.models import ProjectMembership
from labeling.models import LabelingMembership
from answer.models import Answer
from item.models import ItemMembership


class UserQuerySet(QuerySet):

    def user_dashboard_qs(self):
        #incluidos pois, ao atribuir eles à variável qs, estavam todos juntos em um get_queryset
        #é um problema, pois poderia inflar a contagem no produto cartesiano 
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
            pending_items_count=Subquery(pending_items, output_field=IntegerField()),
        )
    
        #Por que adicionar? Pois podemos juntar as buscas por email em _create_or_get_pending_user
        #e accept_invitation
        #além disso, é uma leitura simples e daz parte do domínio

    def user_email(self, email):
        #mesma função só que com o parâmetro
        return(
            self.filter(email__iexact = (email or "").strip().lower()) )
    
    #Adicionar mais coisas para organizar melhor o código!
        