"""Testes do modo "usar a chave de IA só nesta sessão" (header X-User-LLM-Key).

O que precisa ficar provado aqui:

* a chave que vem no header é a que chega no provedor BYOK;
* sem o header, a credencial salva e criptografada no banco continua valendo;
* sem header e sem credencial, cai no Ollama local;
* a chave sai de request.META antes de a requisição terminar, e não sobra nem
  no cache de request.headers;
* o filtro do relatório de exceção esconde o header.

Os cenários são montados de ponta a ponta pela API (POST /answers/), com o setup
de answer.tests.LLMDecisionTieBreakTest: rotulação com decision=True,
decision_mode=LLM e users_per_item=2, em que duas respostas divergentes empatam
e disparam o desempate na segunda.
"""

import base64
import os

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils.timezone import now
from rest_framework import status
from rest_framework.request import Request
from rest_framework.test import APIClient, APIRequestFactory, force_authenticate
from unittest.mock import patch

from annotaise.crypto import encrypt_secret
from annotaise.user_llm_key import (
    KEY_META,
    PROVIDER_META,
    USER_LLM_KEY_HEADER,
    UserLlmKeyReporterFilter,
    pop_user_llm_key,
)
from item.models import Item, ItemMembership
from labeling.models import (
    AICredential,
    Labeling,
    LabelingElement,
    LabelingSection,
    MultipleChoiceItem,
)
from project.models import Project

from .models import Answer
from .views import AnswerViewset

# Chave AES-256 própria do teste: assim os testes não dependem de
# AI_BYOK_ENCRYPTION_KEY estar no ambiente onde a suíte roda.
TEST_ENCRYPTION_KEY = base64.b64encode(os.urandom(32)).decode("ascii")

# Chaves fictícias. As duas são diferentes de propósito: nos testes de
# precedência é a diferença entre elas que mostra qual caminho foi usado.
SESSION_KEY = "sk-session-header-0000000000000001"
STORED_KEY = "sk-stored-database-000000000000002"


def _llm_result(winner="yes"):
    return {
        "winner": winner,
        "tied": False,
        "models": [],
        "vote_count": {"yes": 3, "no": 2},
        "valid_votes": 5,
    }


@override_settings(AI_BYOK_ENCRYPTION_KEY=TEST_ENCRYPTION_KEY)
class UserLlmKeyTieBreakTestBase(TestCase):
    """Rotulação que empata em 1x1 e cai no desempate por LLM na 2ª resposta."""

    def setUp(self):
        User = get_user_model()
        self.user1 = User.objects.create_user(
            username="byok_user1", email="byok1@example.com", password="123"
        )
        self.user2 = User.objects.create_user(
            username="byok_user2", email="byok2@example.com", password="123"
        )

        self.project = Project.objects.create(
            name="BYOK Session Project", created_by=self.user1
        )
        self.labeling = Labeling.objects.create(
            title="BYOK Session Labeling",
            created_by=self.user1,
            project=self.project,
            decision=True,
            decision_mode=Labeling.DecisionMode.LLM,
            users_per_item=2,
            guide="Guia da rotulação",
            start_date=now().date(),
            final_date=now().date(),
        )
        self.section = LabelingSection.objects.create(
            labeling=self.labeling,
            form_type=LabelingSection.FormType.MAIN,
            title="Main Section",
            order=1,
        )
        self.decisive_question = LabelingElement.objects.create(
            labeling_section=self.section,
            text="Should be accepted?",
            question_type=LabelingElement.QuestionType.MULTIPLE_CHOICE,
            order=1,
        )
        MultipleChoiceItem.objects.create(
            labeling_element=self.decisive_question, text="yes", order=1
        )
        MultipleChoiceItem.objects.create(
            labeling_element=self.decisive_question, text="no", order=2
        )
        self.labeling.decisive_question = self.decisive_question
        self.labeling.save(update_fields=["decisive_question"])

        self.item = Item.objects.create(
            labeling=self.labeling,
            payload={"text": "conteudo do item"},
            row_index=1,
        )
        ItemMembership.objects.create(item=self.item, user=self.user1)
        ItemMembership.objects.create(item=self.item, user=self.user2)

        self.client = APIClient()
        self.url = reverse("answers-list")

    # --- helpers -----------------------------------------------------------

    def _link_credential(self, provider=AICredential.Provider.OPENAI, api_key=STORED_KEY):
        credential = AICredential.objects.create(
            owner=self.user1,
            name=f"cred-{provider}",
            provider=provider,
            encrypted_api_key=encrypt_secret(api_key),
            key_hint=api_key[-4:],
        )
        self.labeling.ai_credential = credential
        self.labeling.save(update_fields=["ai_credential"])
        return credential

    def _answer(self, user, value, **extra):
        self.client.force_authenticate(user)
        return self.client.post(
            self.url,
            {
                "labeling": self.labeling.id,
                "item": self.item.id,
                "answer_payload": {str(self.decisive_question.id): value},
            },
            format="json",
            **extra,
        )

    def _tie(self, **extra_on_second):
        """Empata o item. Só a 2ª resposta (a que desempata) leva os headers."""
        first = self._answer(self.user1, "yes")
        self.assertEqual(first.status_code, status.HTTP_201_CREATED, first.data)
        second = self._answer(self.user2, "no", **extra_on_second)
        self.assertEqual(second.status_code, status.HTTP_201_CREATED, second.data)
        return second


class SessionKeyReachesProviderTest(UserLlmKeyTieBreakTestBase):
    """(a) chave do header -> provedor BYOK."""

    @patch("answer.services.tiebreak.run_llm_tiebreak_decision")
    @patch("answer.services.tiebreak.run_llm_tiebreak_decision_byok")
    def test_header_key_is_the_one_sent_to_the_provider(self, mocked_byok, mocked_ollama):
        mocked_byok.return_value = _llm_result("yes")

        self._tie(
            HTTP_X_USER_LLM_KEY=SESSION_KEY,
            HTTP_X_USER_LLM_PROVIDER="openai",
        )

        mocked_byok.assert_called_once()
        mocked_ollama.assert_not_called()
        kwargs = mocked_byok.call_args.kwargs
        self.assertEqual(kwargs["api_key"], SESSION_KEY)
        self.assertEqual(kwargs["provider"], "openai")
        self.assertEqual(kwargs["question_text"], "Should be accepted?")
        self.assertEqual(kwargs["options"], ["yes", "no"])
        self.assertEqual(kwargs["labeling_guide"], "Guia da rotulação")

        self.item.refresh_from_db()
        self.assertEqual(self.item.status, "finished")
        self.assertEqual(self.item.final_decision_source, "llm")
        self.assertEqual(self.item.final_decision_value, "yes")
        # A chave da sessão não pode ter sido persistida em lugar nenhum.
        self.assertNotIn(SESSION_KEY, str(self.item.llm_tiebreak_result))
        self.assertFalse(AICredential.objects.exists())

    @patch("answer.services.tiebreak.run_llm_tiebreak_decision")
    @patch("answer.services.tiebreak.run_llm_tiebreak_decision_byok")
    def test_header_provider_is_normalized(self, mocked_byok, mocked_ollama):
        """O provider chega ao provedor em minúsculas e sem espaços."""
        mocked_byok.return_value = _llm_result("yes")

        self._tie(
            HTTP_X_USER_LLM_KEY=f"  {SESSION_KEY}  ",
            HTTP_X_USER_LLM_PROVIDER="  Anthropic  ",
        )

        mocked_ollama.assert_not_called()
        kwargs = mocked_byok.call_args.kwargs
        self.assertEqual(kwargs["provider"], "anthropic")
        self.assertEqual(kwargs["api_key"], SESSION_KEY)


class StoredCredentialStillWorksTest(UserLlmKeyTieBreakTestBase):
    """(b) sem header, o fluxo antigo (credencial no banco) segue igual."""

    @patch("answer.services.tiebreak.run_llm_tiebreak_decision")
    @patch("answer.services.tiebreak.run_llm_tiebreak_decision_byok")
    def test_without_header_uses_decrypted_key_from_database(
        self, mocked_byok, mocked_ollama
    ):
        self._link_credential(
            provider=AICredential.Provider.GEMINI, api_key=STORED_KEY
        )
        mocked_byok.return_value = _llm_result("no")

        self._tie()

        mocked_byok.assert_called_once()
        mocked_ollama.assert_not_called()
        kwargs = mocked_byok.call_args.kwargs
        self.assertEqual(kwargs["api_key"], STORED_KEY)
        self.assertEqual(kwargs["provider"], AICredential.Provider.GEMINI)

        self.item.refresh_from_db()
        self.assertEqual(self.item.final_decision_source, "llm")
        self.assertEqual(self.item.final_decision_value, "no")


class NoKeyAnywhereFallsBackToOllamaTest(UserLlmKeyTieBreakTestBase):
    """(c) sem header e sem credencial -> Ollama, nunca BYOK."""

    @patch("answer.services.tiebreak.run_llm_tiebreak_decision")
    @patch("answer.services.tiebreak.run_llm_tiebreak_decision_byok")
    def test_falls_back_to_local_ollama(self, mocked_byok, mocked_ollama):
        mocked_ollama.return_value = _llm_result("yes")

        self._tie()

        mocked_ollama.assert_called_once()
        mocked_byok.assert_not_called()
        self.assertNotIn("api_key", mocked_ollama.call_args.kwargs)
        self.assertNotIn("provider", mocked_ollama.call_args.kwargs)

        self.item.refresh_from_db()
        self.assertEqual(self.item.final_decision_source, "llm")


class ProviderFallbackToCredentialTest(UserLlmKeyTieBreakTestBase):
    """(d) header sem provider + credencial vinculada -> provider da credencial."""

    @patch("answer.services.tiebreak.run_llm_tiebreak_decision")
    @patch("answer.services.tiebreak.run_llm_tiebreak_decision_byok")
    def test_provider_comes_from_credential_key_comes_from_header(
        self, mocked_byok, mocked_ollama
    ):
        self._link_credential(
            provider=AICredential.Provider.ANTHROPIC, api_key=STORED_KEY
        )
        mocked_byok.return_value = _llm_result("yes")

        self._tie(HTTP_X_USER_LLM_KEY=SESSION_KEY)

        mocked_byok.assert_called_once()
        mocked_ollama.assert_not_called()
        kwargs = mocked_byok.call_args.kwargs
        self.assertEqual(kwargs["provider"], AICredential.Provider.ANTHROPIC)
        self.assertEqual(kwargs["api_key"], SESSION_KEY)
        self.assertNotEqual(kwargs["api_key"], STORED_KEY)


class ProviderMissingTest(UserLlmKeyTieBreakTestBase):
    """(e) header sem provider e sem credencial -> BYOK_PROVIDER_MISSING."""

    @patch("answer.services.tiebreak.run_llm_tiebreak_decision")
    @patch("answer.services.tiebreak.run_llm_tiebreak_decision_byok")
    def test_reports_error_and_does_not_finish_item(self, mocked_byok, mocked_ollama):
        response = self._tie(HTTP_X_USER_LLM_KEY=SESSION_KEY)

        mocked_byok.assert_not_called()
        mocked_ollama.assert_not_called()

        self.item.refresh_from_db()
        self.assertEqual(self.item.llm_tiebreak_result["error"], "BYOK_PROVIDER_MISSING")
        self.assertTrue(self.item.llm_tiebreak_attempted)
        self.assertNotEqual(self.item.status, "finished")
        self.assertIsNone(self.item.final_decision_source)
        self.assertIsNone(self.item.final_decision_value)
        self.assertIn("decision_warning", response.data)
        # A resposta humana continua gravada mesmo com o desempate falhando.
        self.assertEqual(
            Answer.objects.filter(item=self.item, labeling=self.labeling).count(), 2
        )
        self.assertNotIn(SESSION_KEY, str(self.item.llm_tiebreak_result))

    @patch("answer.services.tiebreak.run_llm_tiebreak_decision")
    @patch("answer.services.tiebreak.run_llm_tiebreak_decision_byok")
    def test_unknown_provider_is_rejected(self, mocked_byok, mocked_ollama):
        """Provider inexistente não vira chamada a provedor nenhum."""
        self._tie(
            HTTP_X_USER_LLM_KEY=SESSION_KEY,
            HTTP_X_USER_LLM_PROVIDER="provedor-que-nao-existe",
        )

        mocked_byok.assert_not_called()
        mocked_ollama.assert_not_called()
        self.item.refresh_from_db()
        self.assertEqual(self.item.llm_tiebreak_result["error"], "BYOK_PROVIDER_MISSING")


class PrecedenceTest(UserLlmKeyTieBreakTestBase):
    """(g) header e credencial ao mesmo tempo -> vence o header."""

    @patch("answer.services.tiebreak.run_llm_tiebreak_decision")
    @patch("answer.services.tiebreak.run_llm_tiebreak_decision_byok")
    def test_header_wins_over_stored_credential(self, mocked_byok, mocked_ollama):
        credential = self._link_credential(
            provider=AICredential.Provider.OPENAI, api_key=STORED_KEY
        )
        mocked_byok.return_value = _llm_result("yes")

        self._tie(
            HTTP_X_USER_LLM_KEY=SESSION_KEY,
            HTTP_X_USER_LLM_PROVIDER="gemini",
        )

        mocked_byok.assert_called_once()
        mocked_ollama.assert_not_called()
        kwargs = mocked_byok.call_args.kwargs
        self.assertEqual(kwargs["api_key"], SESSION_KEY)
        self.assertEqual(kwargs["provider"], "gemini")

        # A credencial salva continua intacta no banco (nada foi sobrescrito).
        credential.refresh_from_db()
        self.assertEqual(credential.provider, AICredential.Provider.OPENAI)
        self.assertNotEqual(kwargs["api_key"], STORED_KEY)


class KeyDoesNotSurviveTheRequestTest(UserLlmKeyTieBreakTestBase):
    """(f) a chave não sobra em request.META (nem no cache de request.headers)."""

    def _post_through_view(self, user, value, **extra):
        """Chama a viewset com um request cru para poder inspecioná-lo depois."""
        factory = APIRequestFactory()
        request = factory.post(
            self.url,
            {
                "labeling": self.labeling.id,
                "item": self.item.id,
                "answer_payload": {str(self.decisive_question.id): value},
            },
            format="json",
            **extra,
        )
        # Força o cached_property a materializar ANTES da view: se pop_user_llm_key
        # não invalidasse esse cache, a chave continuaria legível em request.headers
        # mesmo depois de sumir do META.
        self.assertEqual(request.headers[USER_LLM_KEY_HEADER], SESSION_KEY)
        force_authenticate(request, user=user)
        response = AnswerViewset.as_view({"post": "create"})(request)
        return request, response

    def _assert_request_is_clean(self, request):
        self.assertNotIn(KEY_META, request.META)
        self.assertNotIn(PROVIDER_META, request.META)
        leaked = [k for k, v in request.META.items() if isinstance(v, str) and SESSION_KEY in v]
        self.assertEqual(leaked, [], f"chave sobrou em request.META: {leaked}")
        self.assertNotIn(USER_LLM_KEY_HEADER, request.headers)

    @patch("answer.services.tiebreak.run_llm_tiebreak_decision")
    @patch("answer.services.tiebreak.run_llm_tiebreak_decision_byok")
    def test_key_is_gone_after_create_that_triggers_tiebreak(
        self, mocked_byok, mocked_ollama
    ):
        mocked_byok.return_value = _llm_result("yes")
        first = self._answer(self.user1, "yes")
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)

        request, response = self._post_through_view(
            self.user2,
            "no",
            HTTP_X_USER_LLM_KEY=SESSION_KEY,
            HTTP_X_USER_LLM_PROVIDER="openai",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # Prova que o header realmente chegou ao desempate nesta mesma requisição.
        self.assertEqual(mocked_byok.call_args.kwargs["api_key"], SESSION_KEY)
        mocked_ollama.assert_not_called()
        self._assert_request_is_clean(request)

    @patch("answer.services.tiebreak.run_llm_tiebreak_decision")
    @patch("answer.services.tiebreak.run_llm_tiebreak_decision_byok")
    def test_key_is_gone_even_when_no_tiebreak_happens(self, mocked_byok, mocked_ollama):
        """A remoção acontece no início de create(), não só no caminho do desempate."""
        request, response = self._post_through_view(
            self.user1,
            "yes",
            HTTP_X_USER_LLM_KEY=SESSION_KEY,
            HTTP_X_USER_LLM_PROVIDER="openai",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mocked_byok.assert_not_called()
        mocked_ollama.assert_not_called()
        self._assert_request_is_clean(request)


class PopUserLlmKeyUnitTest(TestCase):
    """Contrato de annotaise.user_llm_key.pop_user_llm_key isolado da view."""

    def setUp(self):
        self.factory = APIRequestFactory()

    def test_returns_none_when_header_is_absent(self):
        request = self.factory.post("/answers/", {}, format="json")
        self.assertEqual(pop_user_llm_key(request), (None, None))

    def test_returns_none_for_blank_key_but_still_removes_the_headers(self):
        request = self.factory.post(
            "/answers/",
            {},
            format="json",
            HTTP_X_USER_LLM_KEY="   ",
            HTTP_X_USER_LLM_PROVIDER="openai",
        )
        self.assertEqual(pop_user_llm_key(request), (None, None))
        self.assertNotIn(KEY_META, request.META)
        self.assertNotIn(PROVIDER_META, request.META)

    def test_strips_key_and_normalizes_provider(self):
        request = self.factory.post(
            "/answers/",
            {},
            format="json",
            HTTP_X_USER_LLM_KEY=f"\t{SESSION_KEY} ",
            HTTP_X_USER_LLM_PROVIDER=" OpenAI ",
        )
        self.assertEqual(pop_user_llm_key(request), ("openai", SESSION_KEY))

    def test_provider_is_none_when_only_the_key_comes(self):
        request = self.factory.post(
            "/answers/", {}, format="json", HTTP_X_USER_LLM_KEY=SESSION_KEY
        )
        self.assertEqual(pop_user_llm_key(request), (None, SESSION_KEY))

    def test_pops_from_the_underlying_request_of_a_drf_wrapper(self):
        http_request = self.factory.post(
            "/answers/",
            {},
            format="json",
            HTTP_X_USER_LLM_KEY=SESSION_KEY,
            HTTP_X_USER_LLM_PROVIDER="gemini",
        )
        drf_request = Request(http_request)

        self.assertEqual(pop_user_llm_key(drf_request), ("gemini", SESSION_KEY))
        self.assertNotIn(KEY_META, http_request.META)
        self.assertNotIn(KEY_META, drf_request.META)

    def test_invalidates_the_cached_headers_mapping(self):
        request = self.factory.post(
            "/answers/", {}, format="json", HTTP_X_USER_LLM_KEY=SESSION_KEY
        )
        # Cache quente antes do pop.
        self.assertEqual(request.headers[USER_LLM_KEY_HEADER], SESSION_KEY)

        pop_user_llm_key(request)

        self.assertNotIn(USER_LLM_KEY_HEADER, request.headers)

    def test_second_call_finds_nothing(self):
        request = self.factory.post(
            "/answers/",
            {},
            format="json",
            HTTP_X_USER_LLM_KEY=SESSION_KEY,
            HTTP_X_USER_LLM_PROVIDER="openai",
        )
        self.assertEqual(pop_user_llm_key(request), ("openai", SESSION_KEY))
        self.assertEqual(pop_user_llm_key(request), (None, None))


class UserLlmKeyReporterFilterTest(TestCase):
    """A página de debug / e-mail de erro não pode mostrar a chave."""

    def setUp(self):
        self.factory = APIRequestFactory()

    def test_key_header_is_cleansed_in_the_exception_report(self):
        request = self.factory.post(
            "/answers/",
            {},
            format="json",
            HTTP_X_USER_LLM_KEY=SESSION_KEY,
            HTTP_X_USER_LLM_PROVIDER="openai",
        )
        reporter_filter = UserLlmKeyReporterFilter()

        meta = reporter_filter.get_safe_request_meta(request)

        self.assertEqual(meta[KEY_META], reporter_filter.cleansed_substitute)
        self.assertNotIn(SESSION_KEY, str(meta))
