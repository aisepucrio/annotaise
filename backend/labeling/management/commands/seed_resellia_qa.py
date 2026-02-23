from __future__ import annotations

from datetime import timedelta
from textwrap import dedent
from typing import Any

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from answer.models import Answer, BackgroundAnswer
from item.models import Item
from labeling.models import (
    Labeling,
    LabelingElement,
    LabelingMembership,
    LabelingSection,
    MultipleChoiceItem,
    QuestionRange,
)
from project.models import Project, ProjectMembership


PROJECT_NAME = "ReSellia QA"
LABELING_TITLE = "Verificação Multimodal de Anúncio (v1)"

PROJECT_DESCRIPTION = (
    "Enriquecimento + QA de anúncios de marketplace para reduzir fraude/mismatch "
    "e melhorar busca/ranking."
)

LABELING_GUIDE_MARKDOWN = dedent(
    """
    # ReSellia QA — Guia de Rotulação (v1)

    ## Objetivo
    Você vai ajudar a medir **qualidade e confiabilidade** de anúncios de marketplace.

    ## Regras rápidas
    - Use apenas o que aparece na ferramenta.
    - Não pesquise fora e não adivinhe.
    - Se faltar prova, marque isso.

    ## Fluxo
    1) Background
    2) Sessão 1 — Primeira impressão (texto)
    3) Sessão 2 — Revisão com evidências (fotos + ficha técnica + conversa)

    Ao avançar, não dá para voltar.

    ## O que avaliar
    **Sessão 1**
    - Percepção de preço (de muito caro a muito barato)
    - Sinais no texto
    - Risco (0–100)
    - O que falta para confiar

    **Sessão 2**
    - Percepção de preço novamente
    - Se as evidências sustentam o anúncio
    - Alertas visuais
    - Condição geral e justificativa curta

    Dica: use **Parcialmente** quando o anúncio parecer real, mas sem prova de algum ponto importante.
    """
).strip()

COLUMN_NAMES = [
    "listing_id",
    "title",
    "description",
    "price_brl",
    "city_state",
    "ficha_tecnica",
    "conversa",
    "image_main_url",
    "image_detail_url",
]

PRICE_PERCEPTION_OPTIONS = [
    "Muito caro",
    "Caro",
    "Normal",
    "Barato",
    "Muito barato",
]

SAMPLE_ROWS: list[dict[str, Any]] = [
    {
        "listing_id": "RS_0001",
        "title": "Nintendo Switch v2 + dock + joy-cons (sem drift)",
        "description": (
            "Console usado em casa. Vai com dock, 2 joy-cons, HDMI e fonte. "
            "Sem caixa e sem NF. Testado, funciona ok. Retiro em mãos."
        ),
        "price_brl": 1550,
        "city_state": "São Paulo-SP",
        "ficha_tecnica": dedent(
            """
            **Modelo:** `HAC-001(-01)`
            **Armazenamento:** 32GB
            **Inclui:**
            - Console
            - Dock
            - 2 Joy-Con
            - Fonte
            - HDMI

            ```txt
            Estado informado: usado / testado
            Motivo da venda: parado
            ```
            """
        ).strip(),
        "conversa": dedent(
            """
            **Chat:**

            **Comprador:** tem nota fiscal?

            **Vendedor:** não tenho, foi presente.

            **Comprador:** aceita ML envios?

            **Vendedor:** só retirada.
            """
        ).strip(),
        "image_main_url": (
            "https://commons.wikimedia.org/wiki/Special:FilePath/"
            "Nintendo-Switch-Console-Docked-wJoyConRB.jpg"
        ),
        "image_detail_url": (
            "https://commons.wikimedia.org/wiki/Special:FilePath/"
            "Nintendo-Switch-Console-Bare-BR.jpg"
        ),
    },
    {
        "listing_id": "RS_0002",
        "title": 'MacBook Pro 13" 2019 Touch Bar 16GB/512GB',
        "description": (
            "Notebook bem cuidado, bateria segura bem. Tela ok. Vai com carregador. "
            "Sem caixa. Formatei e deixei pronto."
        ),
        "price_brl": 4200,
        "city_state": "Curitiba-PR",
        "ficha_tecnica": dedent(
            """
            **Modelo:** MacBook Pro 13" (2019)
            **CPU/RAM/SSD:** `i5 / 16GB / 512GB`
            **Bateria:** `ciclos ~ 320`
            **Acompanha:** carregador

            - Sem sinais de queda
            - Teclado PT/US a confirmar na foto
            """
        ).strip(),
        "conversa": dedent(
            """
            **Chat:**

            **Comprador:** tem algum defeito no teclado?

            **Vendedor:** nunca deu problema, sempre usei capa.

            **Comprador:** manda foto do serial?

            **Vendedor:** prefiro não expor aqui.
            """
        ).strip(),
        "image_main_url": (
            "https://commons.wikimedia.org/wiki/Special:FilePath/"
            "MacBook_Pro_2019_13_inch.jpg"
        ),
        "image_detail_url": (
            "https://commons.wikimedia.org/wiki/Special:FilePath/"
            "Macbook_Pro_Keyboard_(US_Layout).jpg"
        ),
    },
    {
        "listing_id": "RS_0003",
        "title": "Adidas Stan Smith (par) tam 41 - pouco uso",
        "description": (
            "Usei poucas vezes, ficou guardado. Sem rasgos. Solado bom. Entrego limpo."
        ),
        "price_brl": 280,
        "city_state": "Belo Horizonte-MG",
        "ficha_tecnica": dedent(
            """
            **Tamanho:** `41 BR`
            **Cor:** branco/verde
            **Condição declarada:** pouco uso

            Checklist:
            - costuras ok
            - solado sem descolar
            """
        ).strip(),
        "conversa": dedent(
            """
            **Chat:**

            **Comprador:** tem caixa?

            **Vendedor:** não, só o par mesmo.

            **Comprador:** manda foto do solado?

            **Vendedor:** tá nas fotos, é de boa.
            """
        ).strip(),
        "image_main_url": (
            "https://commons.wikimedia.org/wiki/Special:FilePath/"
            "Adidas_Stan_Smith_wht-blk.jpg"
        ),
        "image_detail_url": (
            "https://commons.wikimedia.org/wiki/Special:FilePath/"
            "Adidas_Stan_Smith_(made_in_France).jpg"
        ),
    },
    {
        "listing_id": "RS_0004",
        "title": "Bicicleta speed (quadro 54) pronta pra rodar",
        "description": (
            "Speed leve, boa pra treino. Troquei fita do guidão recente. "
            "Precisa revisão simples no câmbio. Não aceito troca."
        ),
        "price_brl": 3500,
        "city_state": "Florianópolis-SC",
        "ficha_tecnica": dedent(
            """
            **Tipo:** speed/road bike
            **Quadro:** `54` (declarado)
            **Pontos:**
            - revisão no câmbio
            - fita do guidão nova

            ```txt
            Acessórios: sem pedal
            ```
            """
        ).strip(),
        "conversa": dedent(
            """
            **Chat:**

            **Comprador:** qual grupo? Shimano qual?

            **Vendedor:** não sei, comprei assim.

            **Comprador:** tem nota ou numeração do quadro?

            **Vendedor:** nunca olhei isso.
            """
        ).strip(),
        "image_main_url": (
            "https://commons.wikimedia.org/wiki/Special:FilePath/"
            "Specialized_road_bike.JPG"
        ),
        "image_detail_url": (
            "https://commons.wikimedia.org/wiki/Special:FilePath/Bicycle_road.jpg"
        ),
    },
    {
        "listing_id": "RS_0005",
        "title": "Câmera DSLR Canon + lente 50mm (leia)",
        "description": (
            "Câmera funcionando. Vai com lente 50mm e tampa. Não acompanha cartão. "
            "Tô vendendo pq migrei pra mirrorless."
        ),
        "price_brl": 1900,
        "city_state": "Recife-PE",
        "ficha_tecnica": dedent(
            """
            **Marca:** Canon (declarado)
            **Tipo:** DSLR
            **Inclui:**
            - corpo
            - lente `50mm`
            - tampa

            Observação: sem cartão / sem bolsa
            """
        ).strip(),
        "conversa": dedent(
            """
            **Chat:**

            **Comprador:** quantos cliques?

            **Vendedor:** não sei informar.

            **Comprador:** tem fungo na lente?

            **Vendedor:** nunca reparei.
            """
        ).strip(),
        "image_main_url": (
            "https://commons.wikimedia.org/wiki/Special:FilePath/"
            "Canon_Camera_(Unsplash).jpg"
        ),
        "image_detail_url": (
            "https://commons.wikimedia.org/wiki/Special:FilePath/"
            "DSLR_Camera_with_Lens_on_a_Tripod_head.jpg"
        ),
    },
    {
        "listing_id": "RS_0006",
        "title": "Violão acústico - ótimo pra estudo",
        "description": (
            "Violão bom pra iniciante, som ok. Tem marcas de uso normal. "
            "Cordas trocadas faz 2 meses."
        ),
        "price_brl": 450,
        "city_state": "Porto Alegre-RS",
        "ficha_tecnica": dedent(
            """
            **Tipo:** violão acústico
            **Uso:** estudo
            **Estado declarado:** marcas normais

            - cordas trocadas há ~2 meses
            - sem case
            """
        ).strip(),
        "conversa": dedent(
            """
            **Chat:**

            **Comprador:** trasteja?

            **Vendedor:** não, só altura padrão.

            **Comprador:** tem rachadura?

            **Vendedor:** não vi nada.
            """
        ).strip(),
        "image_main_url": (
            "https://commons.wikimedia.org/wiki/Special:FilePath/Acoustic_Guitar.jpg"
        ),
        "image_detail_url": (
            "https://commons.wikimedia.org/wiki/Special:FilePath/"
            "Close-up_Acoustic_Guitar.jpg"
        ),
    },
]


class Command(BaseCommand):
    help = (
        "Cria seed ReSellia QA com projeto, rotulação, background, sessões de "
        "formulário e itens."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--admin-email",
            type=str,
            help=(
                "Email do administrador ao qual a criação do projeto/rotulação "
                "será atribuída."
            ),
        )
        parser.add_argument(
            "--no-input",
            action="store_true",
            help=(
                "Não pergunta no terminal. Exige --admin-email para executar em "
                "modo não interativo."
            ),
        )

    def handle(self, *args, **options):
        admin_email = self._resolve_admin_email(
            admin_email=options.get("admin_email"),
            no_input=options.get("no_input", False),
        )
        admin_user = self._get_admin_user(admin_email)

        with transaction.atomic():
            project = self._upsert_project(admin_user)
            self._ensure_project_membership(project, admin_user)
            labeling = self._upsert_labeling(project, admin_user)
            self._ensure_labeling_membership(labeling, admin_user)
            self._replace_structure(labeling)
            items_count = self._replace_items(labeling)
            prefilled_answers = self._seed_creator_answers(labeling, admin_user)

        self.stdout.write(
            self.style.SUCCESS(
                "Seed ReSellia QA concluído com sucesso:\n"
                f"- Projeto: {project.name} (id={project.id})\n"
                f"- Rotulação: {labeling.title} (id={labeling.id})\n"
                f"- Itens carregados: {items_count}\n"
                f"- Itens pré-preenchidos pelo criador: {prefilled_answers}\n"
                f"- Criador atribuído a: {admin_user.email}"
            )
        )

    def _resolve_admin_email(self, admin_email: str | None, no_input: bool) -> str:
        if admin_email:
            normalized = admin_email.strip().lower()
            if normalized:
                return normalized

        if no_input:
            raise CommandError(
                "Informe --admin-email quando usar --no-input."
            )

        typed = input(
            "Digite o email do administrador para atribuir a criação do seed: "
        ).strip().lower()
        if not typed:
            raise CommandError("Email do administrador não pode ser vazio.")
        return typed

    def _get_admin_user(self, email: str):
        user_model = get_user_model()
        user = user_model.objects.filter(email__iexact=email).first()
        if user is None:
            raise CommandError(
                f"Nenhum usuário encontrado com o email '{email}'."
            )
        if user.account_type != "admin" and not user.is_superuser:
            raise CommandError(
                f"O usuário '{email}' existe, mas não é administrador."
            )
        return user

    def _upsert_project(self, admin_user):
        project, _ = Project.objects.get_or_create(
            name=PROJECT_NAME,
            created_by=admin_user,
            defaults={
                "description": PROJECT_DESCRIPTION,
                "status": "active",
            },
        )

        fields_to_update: list[str] = []
        if project.description != PROJECT_DESCRIPTION:
            project.description = PROJECT_DESCRIPTION
            fields_to_update.append("description")
        if project.status != "active":
            project.status = "active"
            fields_to_update.append("status")
        if fields_to_update:
            project.save(update_fields=fields_to_update)
        return project

    def _ensure_project_membership(self, project: Project, admin_user):
        membership, _ = ProjectMembership.objects.get_or_create(
            project=project,
            user=admin_user,
            defaults={"role": ProjectMembership.RoleChoices.OWNER},
        )
        if membership.role != ProjectMembership.RoleChoices.OWNER:
            membership.role = ProjectMembership.RoleChoices.OWNER
            membership.save(update_fields=["role"])

    def _upsert_labeling(self, project: Project, admin_user):
        today = timezone.now().date()
        final_date = today + timedelta(days=90)

        labeling = (
            Labeling.objects.filter(project=project, title=LABELING_TITLE)
            .order_by("id")
            .first()
        )

        if labeling is None:
            labeling = Labeling.objects.create(
                project=project,
                created_by=admin_user,
                title=LABELING_TITLE,
                start_date=today,
                final_date=final_date,
                decision=True,
                guide=LABELING_GUIDE_MARKDOWN,
                users_per_item=1,
                block_section_back=True,
                has_background_form=True,
                column_names=COLUMN_NAMES,
                status=Labeling.Status.ACTIVE,
            )
            return labeling

        fields_to_update: list[str] = []
        desired_values = {
            "created_by": admin_user,
            "start_date": today,
            "final_date": final_date,
            "decision": True,
            "guide": LABELING_GUIDE_MARKDOWN,
            "users_per_item": 1,
            "block_section_back": True,
            "has_background_form": True,
            "column_names": COLUMN_NAMES,
            "status": Labeling.Status.ACTIVE,
        }

        for field, value in desired_values.items():
            if getattr(labeling, field) != value:
                setattr(labeling, field, value)
                fields_to_update.append(field)

        if fields_to_update:
            labeling.save(update_fields=fields_to_update)

        return labeling

    def _ensure_labeling_membership(self, labeling: Labeling, admin_user):
        membership, _ = LabelingMembership.objects.get_or_create(
            labeling=labeling,
            user=admin_user,
            defaults={"role": LabelingMembership.Role.OWNER},
        )
        if membership.role != LabelingMembership.Role.OWNER:
            membership.role = LabelingMembership.Role.OWNER
            membership.save(update_fields=["role"])

    def _replace_structure(self, labeling: Labeling):
        LabelingSection.objects.filter(labeling=labeling).delete()

        self._create_background_section(labeling)
        self._create_session_1_section(labeling)
        self._create_session_2_section(labeling)

    def _create_background_section(self, labeling: Labeling):
        section = LabelingSection.objects.create(
            labeling=labeling,
            form_type=LabelingSection.FormType.BACKGROUND,
            title="Background",
            order=1,
        )

        self._create_number_question(
            section=section,
            order=1,
            text="Idade",
            required=True,
        )
        self._create_range_question(
            section=section,
            order=2,
            text="Familiaridade com compra/venda online (0 a 10)",
            start=0,
            end=10,
            step=1,
            required=True,
        )
        self._create_multiple_choice_question(
            section=section,
            order=3,
            text="Categorias que você se sente confortável em avaliar",
            options=[
                "Eletrônicos",
                "Computadores",
                "Moda (tênis/roupa)",
                "Bikes",
                "Instrumentos musicais",
                "Fotografia",
            ],
            allow_multiple=True,
            required=True,
        )
        self._create_multiple_choice_question(
            section=section,
            order=4,
            text="Compromisso",
            options=[
                "Vou rotular só com o que aparece aqui (sem buscar fora)",
                "Não concordo",
            ],
            allow_multiple=False,
            required=True,
        )

    def _create_session_1_section(self, labeling: Labeling):
        section = LabelingSection.objects.create(
            labeling=labeling,
            form_type=LabelingSection.FormType.MAIN,
            title="1 - Primeira impressão",
            order=1,
        )

        self._create_context(
            section=section,
            order=1,
            text="Título do anúncio",
            column_name="title",
            context_type=LabelingElement.ContextType.TEXT,
        )
        self._create_context(
            section=section,
            order=2,
            text="Descrição do anúncio",
            column_name="description",
            context_type=LabelingElement.ContextType.TEXT,
        )
        self._create_context(
            section=section,
            order=3,
            text="Preço (R$)",
            column_name="price_brl",
            context_type=LabelingElement.ContextType.NUMBER,
        )
        self._create_context(
            section=section,
            order=4,
            text="Localização",
            column_name="city_state",
            context_type=LabelingElement.ContextType.TEXT,
        )

        self._create_multiple_choice_question(
            section=section,
            order=5,
            text="Com base no que você viu até agora, o preço parece:",
            options=PRICE_PERCEPTION_OPTIONS,
            allow_multiple=False,
            required=True,
        )
        self._create_multiple_choice_question(
            section=section,
            order=6,
            text="O texto contém quais sinais abaixo?",
            options=[
                "Sem nota fiscal",
                "Sem caixa",
                "Aceita troca",
                "Só retirada",
                "Envio disponível",
                "“Pouco uso”",
                "“Testado/funcionando”",
                "Precisa manutenção",
                "Vendedor evita detalhes",
                "Outro",
            ],
            allow_multiple=True,
            required=True,
        )
        self._create_number_question(
            section=section,
            order=7,
            text="Quantos itens o vendedor diz que inclui no pacote? (0 se não fala)",
            required=True,
        )
        self._create_range_question(
            section=section,
            order=8,
            text="Risco do anúncio ser problemático só pelo texto (0 a 100)",
            start=0,
            end=100,
            step=1,
            required=True,
        )
        self._create_text_question(
            section=section,
            order=9,
            text="O que está faltando para você confiar? (1 frase objetiva)",
            required=True,
        )

    def _create_session_2_section(self, labeling: Labeling):
        section = LabelingSection.objects.create(
            labeling=labeling,
            form_type=LabelingSection.FormType.MAIN,
            title="2 — Revisão com evidências",
            order=2,
        )

        self._create_context(
            section=section,
            order=1,
            text="Foto principal",
            column_name="image_main_url",
            context_type=LabelingElement.ContextType.IMAGE,
        )
        self._create_context(
            section=section,
            order=2,
            text="Foto detalhe",
            column_name="image_detail_url",
            context_type=LabelingElement.ContextType.IMAGE,
        )
        self._create_context(
            section=section,
            order=3,
            text="Ficha técnica (do vendedor)",
            column_name="ficha_tecnica",
            context_type=LabelingElement.ContextType.TEXT,
        )
        self._create_context(
            section=section,
            order=4,
            text="Trecho de conversa",
            column_name="conversa",
            context_type=LabelingElement.ContextType.TEXT,
        )

        self._create_multiple_choice_question(
            section=section,
            order=5,
            text="Com base no que você viu até agora, o preço parece:",
            options=PRICE_PERCEPTION_OPTIONS,
            allow_multiple=False,
            required=True,
        )
        self._create_multiple_choice_question(
            section=section,
            order=6,
            text="As fotos, a ficha técnica e a conversa sustentam o que o vendedor afirma?",
            options=["Sim", "Parcialmente", "Não", "Não dá pra concluir"],
            allow_multiple=False,
            required=True,
        )
        self._create_multiple_choice_question(
            section=section,
            order=7,
            text="Problemas/alertas visuais",
            options=[
                "Foto borrada/escura",
                "Item diferente entre fotos",
                "Marcas fortes (riscos/trincas)",
                "Peças faltando",
                "Sinais de mau armazenamento (mofo/ferrugem)",
                "Marca/modelo não visível",
                "Nada disso",
            ],
            allow_multiple=True,
            required=True,
        )
        self._create_number_question(
            section=section,
            order=8,
            text="Quantos itens físicos aparecem claramente nas fotos?",
            required=True,
        )
        self._create_range_question(
            section=section,
            order=9,
            text="Condição geral (0 quebrado, 100 cara de novo)",
            start=0,
            end=100,
            step=1,
            required=True,
        )
        self._create_text_question(
            section=section,
            order=10,
            text="Justificativa curta do score (máx. 200 caracteres)",
            required=True,
        )

    def _create_context(
        self,
        *,
        section: LabelingSection,
        order: int,
        text: str,
        column_name: str,
        context_type: str,
    ) -> LabelingElement:
        return LabelingElement.objects.create(
            labeling_section=section,
            order=order,
            text=text,
            required=False,
            question_type=LabelingElement.QuestionType.CONTEXT,
            column_name=column_name,
            context_type=context_type,
        )

    def _create_text_question(
        self,
        *,
        section: LabelingSection,
        order: int,
        text: str,
        required: bool,
    ) -> LabelingElement:
        return LabelingElement.objects.create(
            labeling_section=section,
            order=order,
            text=text,
            required=required,
            question_type=LabelingElement.QuestionType.TEXT,
            allow_multiple=False,
        )

    def _create_number_question(
        self,
        *,
        section: LabelingSection,
        order: int,
        text: str,
        required: bool,
    ) -> LabelingElement:
        return LabelingElement.objects.create(
            labeling_section=section,
            order=order,
            text=text,
            required=required,
            question_type=LabelingElement.QuestionType.NUMBER,
            allow_multiple=False,
        )

    def _create_range_question(
        self,
        *,
        section: LabelingSection,
        order: int,
        text: str,
        start: float,
        end: float,
        step: float,
        required: bool,
    ) -> LabelingElement:
        element = LabelingElement.objects.create(
            labeling_section=section,
            order=order,
            text=text,
            required=required,
            question_type=LabelingElement.QuestionType.RANGE,
            allow_multiple=False,
        )
        QuestionRange.objects.create(
            labeling_element=element,
            start=start,
            end=end,
            step=step,
        )
        return element

    def _create_multiple_choice_question(
        self,
        *,
        section: LabelingSection,
        order: int,
        text: str,
        options: list[str],
        allow_multiple: bool,
        required: bool,
    ) -> LabelingElement:
        element = LabelingElement.objects.create(
            labeling_section=section,
            order=order,
            text=text,
            required=required,
            question_type=LabelingElement.QuestionType.MULTIPLE_CHOICE,
            allow_multiple=allow_multiple,
        )

        for idx, option in enumerate(options, start=1):
            MultipleChoiceItem.objects.create(
                labeling_element=element,
                text=option,
                value=False,
                order=idx,
            )
        return element

    def _replace_items(self, labeling: Labeling) -> int:
        Item.objects.filter(labeling=labeling).delete()

        items_to_create = []
        for index, row in enumerate(SAMPLE_ROWS):
            payload = {column_name: row[column_name] for column_name in COLUMN_NAMES}
            items_to_create.append(
                Item(
                    labeling=labeling,
                    payload=payload,
                    row_index=index,
                    status=Item.Status.PENDING,
                )
            )
        Item.objects.bulk_create(items_to_create)
        return len(items_to_create)

    def _seed_creator_answers(self, labeling: Labeling, admin_user) -> int:
        background_section = (
            LabelingSection.objects.filter(
                labeling=labeling,
                form_type=LabelingSection.FormType.BACKGROUND,
            )
            .order_by("order")
            .first()
        )
        if background_section:
            background_questions = list(
                background_section.elements.exclude(
                    question_type=LabelingElement.QuestionType.CONTEXT
                ).order_by("order")
            )
            background_payload: dict[str, Any] = {}

            for question in background_questions:
                question_key = str(question.id)
                question_text = (question.text or "").strip().lower()

                if question.question_type == LabelingElement.QuestionType.NUMBER:
                    background_payload[question_key] = 32
                    continue

                if question.question_type == LabelingElement.QuestionType.RANGE:
                    background_payload[question_key] = 8
                    continue

                if question.question_type == LabelingElement.QuestionType.TEXT:
                    background_payload[question_key] = "Resposta de background"
                    continue

                if question.question_type == LabelingElement.QuestionType.MULTIPLE_CHOICE:
                    options = list(
                        question.multiple_choice_items.order_by("order").values_list(
                            "text", flat=True
                        )
                    )
                    if not options:
                        continue

                    if question.allow_multiple:
                        preferred = ["Eletrônicos", "Computadores", "Fotografia"]
                        selected = [option for option in preferred if option in options]
                        background_payload[question_key] = selected or options[:2]
                        continue

                    preferred_single = "Vou rotular só com o que aparece aqui (sem buscar fora)"
                    if preferred_single in options:
                        background_payload[question_key] = preferred_single
                    else:
                        background_payload[question_key] = options[0]
                    continue

                if "idade" in question_text:
                    background_payload[question_key] = 32
                elif "familiaridade" in question_text:
                    background_payload[question_key] = 8
                else:
                    background_payload[question_key] = ""

            if background_payload:
                BackgroundAnswer.objects.update_or_create(
                    labeling=labeling,
                    answered_by=admin_user,
                    defaults={"answer_payload": background_payload},
                )

        main_sections = list(
            LabelingSection.objects.filter(
                labeling=labeling,
                form_type=LabelingSection.FormType.MAIN,
            ).order_by("order")
        )
        if len(main_sections) < 2:
            raise CommandError(
                "Não foi possível gerar respostas exemplo: faltam seções principais."
            )

        session_1_questions = list(
            main_sections[0].elements.exclude(
                question_type=LabelingElement.QuestionType.CONTEXT
            ).order_by("order")
        )
        session_2_questions = list(
            main_sections[1].elements.exclude(
                question_type=LabelingElement.QuestionType.CONTEXT
            ).order_by("order")
        )
        if len(session_1_questions) != 5 or len(session_2_questions) != 6:
            raise CommandError(
                "Não foi possível gerar respostas exemplo: estrutura da rotulação diferente do esperado."
            )

        question_ids = {
            "s1_price": str(session_1_questions[0].id),
            "s1_signals": str(session_1_questions[1].id),
            "s1_items": str(session_1_questions[2].id),
            "s1_risk": str(session_1_questions[3].id),
            "s1_missing": str(session_1_questions[4].id),
            "s2_price": str(session_2_questions[0].id),
            "s2_supports": str(session_2_questions[1].id),
            "s2_alerts": str(session_2_questions[2].id),
            "s2_visible_items": str(session_2_questions[3].id),
            "s2_condition": str(session_2_questions[4].id),
            "s2_reason": str(session_2_questions[5].id),
        }

        seeded_payloads = [
            {
                "row_index": 0,
                "payload": {
                    question_ids["s1_price"]: "Normal",
                    question_ids["s1_signals"]: [
                        "Sem nota fiscal",
                        "Sem caixa",
                        "Só retirada",
                        "“Testado/funcionando”",
                    ],
                    question_ids["s1_items"]: 6,
                    question_ids["s1_risk"]: 62,
                    question_ids["s1_missing"]: (
                        "Falta comprovar origem e mostrar melhor o estado dos controles."
                    ),
                    question_ids["s2_price"]: "Normal",
                    question_ids["s2_supports"]: "Parcialmente",
                    question_ids["s2_alerts"]: ["Nada disso"],
                    question_ids["s2_visible_items"]: 4,
                    question_ids["s2_condition"]: 78,
                    question_ids["s2_reason"]: (
                        "As fotos parecem coerentes, mas não provam tudo do anúncio."
                    ),
                },
            },
            {
                "row_index": 3,
                "payload": {
                    question_ids["s1_price"]: "Caro",
                    question_ids["s1_signals"]: [
                        "Precisa manutenção",
                        "Vendedor evita detalhes",
                    ],
                    question_ids["s1_items"]: 0,
                    question_ids["s1_risk"]: 74,
                    question_ids["s1_missing"]: (
                        "Faltam grupo, numeração do quadro e detalhes de desgaste."
                    ),
                    question_ids["s2_price"]: "Caro",
                    question_ids["s2_supports"]: "Parcialmente",
                    question_ids["s2_alerts"]: ["Marca/modelo não visível"],
                    question_ids["s2_visible_items"]: 1,
                    question_ids["s2_condition"]: 55,
                    question_ids["s2_reason"]: (
                        "Parece usada e real, mas falta prova clara dos componentes."
                    ),
                },
            },
            {
                "row_index": 4,
                "payload": {
                    question_ids["s1_price"]: "Normal",
                    question_ids["s1_signals"]: ["Outro"],
                    question_ids["s1_items"]: 3,
                    question_ids["s1_risk"]: 45,
                    question_ids["s1_missing"]: (
                        "Falta informar shutter count e estado óptico da lente."
                    ),
                    question_ids["s2_price"]: "Normal",
                    question_ids["s2_supports"]: "Parcialmente",
                    question_ids["s2_alerts"]: ["Marca/modelo não visível"],
                    question_ids["s2_visible_items"]: 2,
                    question_ids["s2_condition"]: 72,
                    question_ids["s2_reason"]: (
                        "Fotos mostram o conjunto, mas sem detalhe técnico suficiente."
                    ),
                },
            },
        ]

        answers_created = 0
        for answer_data in seeded_payloads:
            item = Item.objects.filter(
                labeling=labeling,
                row_index=answer_data["row_index"],
            ).first()
            if item is None:
                raise CommandError(
                    f"Item row_index={answer_data['row_index']} não encontrado para preencher resposta exemplo."
                )

            Answer.objects.create(
                labeling=labeling,
                item=item,
                answered_by=admin_user,
                answer_payload=answer_data["payload"],
            )
            answers_created += 1

            if Answer.objects.filter(item=item).count() >= labeling.users_per_item:
                item.status = "finished"
                item.save(update_fields=["status"])

        creator_membership = LabelingMembership.objects.filter(
            labeling=labeling,
            user=admin_user,
        ).first()
        if creator_membership and creator_membership.items_done != answers_created:
            creator_membership.items_done = answers_created
            creator_membership.save(update_fields=["items_done"])

        if labeling.items.exclude(status="finished").exists():
            desired_status = Labeling.Status.ACTIVE
        else:
            desired_status = Labeling.Status.FINISHED
        if labeling.status != desired_status:
            labeling.status = desired_status
            labeling.save(update_fields=["status"])

        return answers_created
