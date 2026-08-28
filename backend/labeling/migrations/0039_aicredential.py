"""Troca LabelingAIConfig (1:1 com Labeling) por AICredential (N:1).

A chave passa a ser cadastrada uma vez por usuário e reutilizada por várias
rotulações, para que trocar uma chave revogada seja uma edição só em vez de
uma por rotulação.
"""

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def migrate_configs_to_credentials(apps, schema_editor):
    """Converte cada config 1:1 existente numa credencial e revincula.

    O dono vira o criador da rotulação. Se ele não existir mais (created_by é
    SET_NULL), a config é descartada: a rotulação volta ao Ollama e o admin
    recadastra a chave pela tela — preferível a adivinhar de quem é a fatura.
    """
    LabelingAIConfig = apps.get_model("labeling", "LabelingAIConfig")
    AICredential = apps.get_model("labeling", "AICredential")

    for config in LabelingAIConfig.objects.select_related("labeling").all():
        labeling = config.labeling
        owner_id = labeling.created_by_id
        if owner_id is None:
            continue

        base_name = f"{config.provider} — {labeling.title}".strip()[:80]
        name = base_name
        suffix = 1
        while AICredential.objects.filter(owner_id=owner_id, name=name).exists():
            suffix += 1
            name = f"{base_name[:74]} ({suffix})"

        credential = AICredential.objects.create(
            owner_id=owner_id,
            name=name,
            provider=config.provider,
            encrypted_api_key=config.encrypted_api_key,
            key_hint=config.key_hint,
        )
        labeling.ai_credential = credential
        labeling.save(update_fields=["ai_credential"])


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('labeling', '0038_labelingaiconfig'),
    ]

    operations = [
        migrations.CreateModel(
            name='AICredential',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=80)),
                ('provider', models.CharField(choices=[('openai', 'OpenAI'), ('anthropic', 'Anthropic'), ('gemini', 'Gemini')], max_length=16)),
                ('encrypted_api_key', models.TextField()),
                ('key_hint', models.CharField(blank=True, default='', max_length=8)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('owner', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='ai_credentials', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['name'],
                'unique_together': {('owner', 'name')},
            },
        ),
        migrations.AddField(
            model_name='labeling',
            name='ai_credential',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='labelings', to='labeling.aicredential'),
        ),
        # Reverso é noop: desfazer a migração recria a tabela antiga vazia e as
        # rotulações ficam sem chave (voltam ao Ollama) em vez de tentar
        # reconstruir um vínculo 1:1 a partir de credenciais compartilhadas.
        migrations.RunPython(migrate_configs_to_credentials, migrations.RunPython.noop),
        migrations.DeleteModel(name='LabelingAIConfig'),
    ]
