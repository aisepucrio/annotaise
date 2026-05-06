from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("item", "0003_item_decision_payload"),
    ]

    operations = [
        migrations.AddField(
            model_name="item",
            name="final_decision_source",
            field=models.CharField(blank=True, max_length=16, null=True),
        ),
        migrations.AddField(
            model_name="item",
            name="final_decision_value",
            field=models.CharField(blank=True, max_length=300, null=True),
        ),
        migrations.AddField(
            model_name="item",
            name="llm_tiebreak_attempted",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="item",
            name="llm_tiebreak_result",
            field=models.JSONField(blank=True, null=True),
        ),
    ]
