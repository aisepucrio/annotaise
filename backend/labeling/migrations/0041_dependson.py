from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    """DependsOn was declared in models.py but never migrated: the table is created here."""

    dependencies = [
        ('labeling', '0040_remove_background_form'),
    ]

    operations = [
        migrations.CreateModel(
            name='DependsOn',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('depends_on', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='dependents', to='labeling.labeling')),
                ('labeling', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='dependencies', to='labeling.labeling')),
            ],
        ),
        migrations.AddConstraint(
            model_name='dependson',
            constraint=models.UniqueConstraint(fields=('labeling', 'depends_on'), name='unique_labeling_dependency'),
        ),
        migrations.AddConstraint(
            model_name='dependson',
            constraint=models.CheckConstraint(condition=~models.Q(labeling=models.F('depends_on')), name='dependency_not_self'),
        ),
    ]
