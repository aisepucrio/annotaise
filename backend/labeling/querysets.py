"""Leitura dos modelos de `labeling` (designpattern.MD §3.2).

Filtro, anotação e ordenação usados pelas views moram aqui como métodos
encadeáveis, e sempre devolvem `QuerySet` — nunca `list`.
"""

from django.db.models import Count, QuerySet


class AICredentialQuerySet(QuerySet):
    def owned_by(self, user):
        """Biblioteca de chaves de um usuário. Credencial é sempre privada."""
        return self.filter(owner=user)

    def with_labelings_count(self):
        """Quantas rotulações apontam para cada credencial."""
        return self.annotate(labelings_count=Count("labelings", distinct=True))
