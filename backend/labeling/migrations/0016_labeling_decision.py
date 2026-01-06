from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("labeling", "0015_labelinggroupquota"),
    ]

    operations = [
        migrations.AddField(
            model_name="labeling",
            name="decision",
            field=models.BooleanField(default=False),
        ),
    ]
