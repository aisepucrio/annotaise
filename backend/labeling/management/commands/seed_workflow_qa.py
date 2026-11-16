from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from rest_framework.exceptions import ValidationError

from labeling.services.qa_seed import seed_workflow_qa


class Command(BaseCommand):
    help = "Cria 8 projetos de QA com 5 rotulações cada, preservando dados de execuções anteriores."

    def add_arguments(self, parser):
        parser.add_argument("--admin-email", help="Email do administrador responsável pelos projetos.")
        parser.add_argument("--no-input", action="store_true", help="Exige --admin-email; não solicita entrada no terminal.")
        parser.add_argument("--demo-password", help="Senha dos novos anotadores de demonstração. Por padrão, gera senhas aleatórias.")

    def handle(self, *args, **options):
        email = (options.get("admin_email") or "").strip()
        if not email and not options["no_input"]:
            email = input("Email do administrador responsável pelo QA: ").strip()
        if not email:
            raise CommandError("Informe --admin-email ao usar --no-input.")
        owner = get_user_model().objects.filter(email__iexact=email, is_active=True).first()
        if owner is None or (owner.account_type != "admin" and not owner.is_superuser):
            raise CommandError("Informe o email de um administrador ativo existente.")
        try:
            result = seed_workflow_qa(owner, demo_password=options.get("demo_password"))
        except ValidationError as exc:
            raise CommandError(str(exc.detail)) from exc
        self.stdout.write(self.style.SUCCESS(
            f"QA Geral criado para {owner.email}: {result['created']} rotulações novas, "
            f"{result['preserved']} preservadas, em {len(result['projects'])} projetos."
        ))
        for project in result["projects"]:
            self.stdout.write(f"- {project.name} (id={project.pk})")
        self.stdout.write("\nAnotadores de demonstração (senha exibida somente na criação):")
        for account in result["credentials"]:
            password = account["password"] or "(senha anterior preservada)"
            self.stdout.write(f"- {account['role']}: {account['email']} | senha: {password}")
        self.stdout.write("O administrador pertence ao Grupo A. O terceiro anotador não pertence aos grupos do seed.")
        self.stdout.write("\nLinks públicos:")
        for labelings in result["labelings"].values():
            for labeling in labelings:
                if labeling.anonymous_url:
                    self.stdout.write(f"- {labeling.title}: {labeling.anonymous_url}")
        self.stdout.write(
            "\nDependências 01/02: cadeia; 03: dois pré-requisitos; 04: liberada; "
            "05: um pré-requisito concluído e outro pendente."
        )
