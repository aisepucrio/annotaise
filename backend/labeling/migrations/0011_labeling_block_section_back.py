from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('labeling', '0010_alter_labelingelement_question_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='labeling',
            name='block_section_back',
            field=models.BooleanField(default=False),
        ),
    ]
