from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("labeling", "0026_alter_labeling_created_by"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="questionrange",
            name="step",
        ),
        migrations.AlterField(
            model_name="questionrange",
            name="end",
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="questionrange",
            name="end_label",
            field=models.CharField(blank=True, default="", max_length=300),
        ),
        migrations.AlterField(
            model_name="questionrange",
            name="start",
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="questionrange",
            name="start_label",
            field=models.CharField(blank=True, default="", max_length=300),
        ),
        migrations.RemoveConstraint(
            model_name="questionrange",
            name="range_end_gt_start",
        ),
        migrations.AddConstraint(
            model_name="questionrange",
            constraint=models.CheckConstraint(
                condition=(
                    models.Q(start__isnull=True)
                    | models.Q(end__isnull=True)
                    | models.Q(end__gt=models.F("start"))
                ),
                name="range_end_gt_start_when_both",
            ),
        ),
    ]
