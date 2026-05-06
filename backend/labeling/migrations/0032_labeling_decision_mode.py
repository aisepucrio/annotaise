from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("labeling", "0031_merge_20260407_1340"),
    ]

    operations = [
        migrations.AddField(
            model_name="labeling",
            name="decision_mode",
            field=models.CharField(
                choices=[("manual", "Manual"), ("llm", "LLM")],
                default="manual",
                max_length=16,
            ),
        ),
    ]
