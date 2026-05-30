from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('labeling', '0033_labeling_form_mode_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='labeling',
            name='anonymous_token',
            field=models.UUIDField(blank=True, editable=False, null=True, unique=True),
        ),
    ]
