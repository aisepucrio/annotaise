
from labeling.models import LabelingMembership

class AnswerTestsHelper():
    @staticmethod
    def enroll(labeling, *users, role="annotator"):
        """
        Whoever answers is a member of the labeling: in the real flow, next-item
        only hands out an item (and only creates an ItemMembership) for someone
        who already passed this check.
        """
        for user in users:
            LabelingMembership.objects.get_or_create(
                labeling=labeling, user=user, defaults={"role": role}
            )
