from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("user", "0005_usergroup_groupmembership"),
    ]

    operations = [
        migrations.AddField(
            model_name="customuser",
            name="onboarding_status",
            field=models.CharField(
                choices=[("pending", "Pendente"), ("active", "Ativo")],
                default="active",
                max_length=32,
            ),
        ),
        migrations.AddField(
            model_name="invitation",
            name="user",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.SET_NULL,
                related_name="received_invitations",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
