from django.db import models


class LabelingQuerySet(models.QuerySet):
    def prerequisites_of(self, labeling):
        """The labelings `labeling` depends on."""
        return self.filter(dependents__labeling=labeling)


class DependsOnQuerySet(models.QuerySet):
    def unfinished(self):
        from .models import Labeling

        return self.exclude(depends_on__status=Labeling.Status.FINISHED)
