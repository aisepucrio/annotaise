from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('answer', '0006_answer_responded_as'),
    ]

    operations = [
        migrations.DeleteModel(
            name='BackgroundAnswer',
        ),
    ]
