from django.db import migrations, models


def delete_background_sections(apps, schema_editor):
    """Background sections share the order sequence with the main ones, so they
    have to go before the unique constraint drops form_type."""
    LabelingSection = apps.get_model('labeling', 'LabelingSection')
    LabelingSection.objects.filter(form_type='background').delete()
    # The cascade leaves deferred FK triggers pending, and Postgres refuses to
    # ALTER the table until they fire.
    if schema_editor.connection.vendor == 'postgresql':
        schema_editor.execute('SET CONSTRAINTS ALL IMMEDIATE')


class Migration(migrations.Migration):

    dependencies = [
        ('labeling', '0039_alter_labeling_project_alter_labelingmembership_role'),
    ]

    operations = [
        migrations.RunPython(delete_background_sections, migrations.RunPython.noop),
        migrations.RemoveConstraint(
            model_name='labelingsection',
            name='unique_section_order_per_labeling_form_type',
        ),
        migrations.RemoveField(
            model_name='labeling',
            name='has_background_form',
        ),
        migrations.RemoveField(
            model_name='labelingsection',
            name='form_type',
        ),
        migrations.AlterModelOptions(
            name='labelingsection',
            options={'ordering': ['labeling_id', 'order']},
        ),
        migrations.AddConstraint(
            model_name='labelingsection',
            constraint=models.UniqueConstraint(
                fields=('labeling', 'order'), name='unique_section_order_per_labeling'
            ),
        ),
    ]
