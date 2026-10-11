from django.db import migrations

# Papel do projeto -> papel equivalente na rotulação.
ROLE_MAP = {"owner": "owner", "contributor": "admin"}


def forwards(apps, schema_editor):
    """
    A edição de rotulação passou a depender de LabelingMembership. Sem isso,
    todo owner/contributor de projeto perderia o acesso de edição às rotulações
    que ele administra.
    """
    Labeling = apps.get_model("labeling", "Labeling")
    LabelingMembership = apps.get_model("labeling", "LabelingMembership")
    ProjectMembership = apps.get_model("project", "ProjectMembership")

    editors_by_project = {}
    for user_id, project_id, role in ProjectMembership.objects.filter(
        role__in=ROLE_MAP
    ).values_list("user_id", "project_id", "role"):
        editors_by_project.setdefault(project_id, []).append((user_id, ROLE_MAP[role]))

    existing = {
        (user_id, labeling_id): (pk, role)
        for pk, user_id, labeling_id, role in LabelingMembership.objects.values_list(
            "id", "user_id", "labeling_id", "role"
        )
    }

    to_create = []
    upgrade_pks = {"owner": [], "admin": []}
    for labeling_id, project_id in Labeling.objects.filter(
        project__isnull=False
    ).values_list("id", "project_id"):
        for user_id, role in editors_by_project.get(project_id, []):
            current = existing.get((user_id, labeling_id))
            if current is None:
                to_create.append(
                    LabelingMembership(
                        labeling_id=labeling_id, user_id=user_id, role=role
                    )
                )
            elif current[1] not in ("owner", role):
                # Quem edita o projeto passa a editar a rotulação: viewer e
                # annotator viram owner/admin. 'owner' nunca é rebaixado.
                upgrade_pks[role].append(current[0])

    LabelingMembership.objects.bulk_create(to_create, batch_size=500)
    for role, pks in upgrade_pks.items():
        if pks:
            LabelingMembership.objects.filter(pk__in=pks).update(role=role)


class Migration(migrations.Migration):

    dependencies = [
        ("labeling", "0037_labelingmembership_last_opened_at_and_more"),
        ("project", "0001_initial"),
    ]

    operations = [
        # Irreversível na prática: não dá pra distinguir o que a migration criou
        # do que já existia.
        migrations.RunPython(forwards, migrations.RunPython.noop),
    ]
