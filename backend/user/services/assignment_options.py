from labeling.models import Labeling
from project.models import ProjectMembership

def get_assignment_options(*, user):
    owner_projects = (  #mudar a escrita do que estava em views pois 1. está dando problema na interpretação 2. request não é identificado
        ProjectMembership.objects.filter(
            user=user,
            role=ProjectMembership.RoleChoices.OWNER,
        )
        .select_related("project")
        .order_by("project__name", "project__id")
    )
    owner_project_ids = [membership.project_id for membership in owner_projects]

    labelings_by_project = {}
    labelings_qs = (
        Labeling.objects.filter(project_id__in=owner_project_ids)
        .order_by("title", "id")
        .values("id", "title", "project_id")
    )
    for labeling in labelings_qs:
        labelings_by_project.setdefault(labeling["project_id"], []).append(
            {"id": labeling["id"], "title": labeling["title"]}
        )

    output = []
    for membership in owner_projects:
        project = membership.project
        output.append(
            {
                "id": project.id,
                "name": project.name,
                "labelings": labelings_by_project.get(project.id, []),
            }
        )
    return output #we dont want to return response in a sefvice module, so we return the output (response only in views)