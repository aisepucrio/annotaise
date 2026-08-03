# Design Pattern — Annotaise

Guia de arquitetura para a refatoração do backend. Define **onde cada tipo de
código mora**, **por que** essa divisão foi escolhida para este projeto em
específico e **o que verificar** ao mexer em cada módulo.

Leia a seção [5. Pontos de atenção](#5-pontos-de-atenção) antes de abrir um PR
que toque em listagem, anotação de queryset ou escrita multi-model. É onde estão
as armadilhas que já custaram bug neste repositório.

---

## 1. Diagnóstico: por que refatorar

Números medidos no estado atual do backend:

| Sintoma | Medida |
| --- | --- |
| Linhas em `*/views.py` | **2.651** (`labeling` 789, `answer` 651, `item` 559) |
| Managers/QuerySets customizados | **0** |
| Arquivos repetindo as constantes do bot de desempate | **5** (inclusive 2 *serializers*) |
| Camadas diferentes com `transaction.atomic` | **3** (views, serializers, management commands) |
| `TODO` admitindo lógica na camada errada | 7 em `*/views.py` |

O problema não é "escolhemos a escola errada". É que **a lógica de domínio está
espalhada por views, serializers e models sem regra**. Onde o padrão já foi
aplicado, ele funciona: `Item.remaining_groups_for` / `Item._slot_open` moram no
model, e `LabelingViewSet._user_can_answer_labeling` os reutiliza justamente para
o dashboard e o distribuidor de itens não divergirem. O `answer/services/` também
já existe — alguém já buscou uma camada de serviço para a operação mais complexa.

A refatoração é **generalizar o que já deu certo**, não inventar um padrão novo.

---

## 2. A arquitetura alvo

**Camada de serviço para escrita + QuerySets/Managers para leitura.**

A divisão é no eixo **leitura x escrita**, e cada lado tem um motivo concreto
neste projeto:

- **Leitura em QuerySet** porque a paginação por cursor exige um `QuerySet`
  preguiçoso até dentro do paginador. "Selectors" ortodoxos que devolvem `list`
  ou DTO **quebram a paginação** (era exatamente o bug removido quando os
  dashboards montavam listas Python e paginavam a lista).
- **Escrita em serviço** porque as escritas atravessam agregados demais para
  caberem em um model: responder um item mexe em `Answer`, `Item`, `Labeling` e
  ainda chama a API de LLM. Enfiar isso no model faz `Answer` conhecer LLM e
  `Invitation` conhecer SMTP.

### Fluxo de uma request

```
HTTP → View (roteia)
        ├── Permission  (pode?)
        ├── Serializer  (formato de entrada/saída)
        ├── QuerySet    (leitura: filtra, anota, ordena — devolve QuerySet)
        └── Service     (escrita: orquestra, transaciona — devolve objeto)
              └── Model (invariantes de um agregado só)
```

Regra de ouro: **a view não decide nada de domínio**. Ela escolhe a permissão, o
serializer e chama um queryset ou um serviço.

---

## 3. O que vai onde

### 3.1 `models.py` — invariantes de **um** agregado

Entra aqui o que só depende do próprio objeto e dos seus filhos diretos.

✅ Já está certo e deve continuar:

```python
Item.remaining_groups()          # cota do próprio item
Item._slot_open(...)             # regra de vaga aberta
Labeling.has_group_quotas        # @property derivada dos próprios campos
Labeling.anonymous_url           # @property
```

❌ Não entra: chamada de API externa, envio de e-mail, orquestração entre
agregados, montagem de payload de resposta HTTP.

### 3.2 `querysets.py` — **toda** leitura

Um arquivo novo por app. Filtro, anotação e ordenação de listagem viram métodos
encadeáveis e nomeados.

```python
# labeling/querysets.py
from datetime import datetime, timezone as dt_timezone
from django.db.models import Count, DateTimeField, OuterRef, Q, QuerySet, Subquery, Value
from django.db.models.functions import Coalesce

# Posição das rotulações nunca abertas. Valor concreto e não NULL — ver 5.1.
NEVER_OPENED = datetime(1970, 1, 1, tzinfo=dt_timezone.utc)


class LabelingQuerySet(QuerySet):
    def for_annotator(self, user):
        """Rotulações em que o usuário ainda tem item pendente para responder."""
        pending = (
            Item.objects
            .filter(status__in=["pending", "in_progress"])
            .exclude(answers__answered_by=user)
            .values("labeling_id")
            .distinct()
        )
        return self.filter(memberships__user=user, id__in=pending)

    def for_manager(self, user):
        """Rotulações dos projetos que o usuário administra."""
        return self.filter(project__memberships__user=user)

    def with_annotator_stats(self, user):
        return self.annotate(
            done_labelings=Count("answers", filter=Q(answers__answered_by=user), distinct=True),
            answers_collected=Count("answers", distinct=True),
        )

    def with_last_opened(self, user):
        """Instante em que o usuário abriu a rotulação. Ordena os dashboards."""
        return self.annotate(
            last_opened=Coalesce(
                Subquery(...),                                    # ver 5.2
                Value(NEVER_OPENED, output_field=DateTimeField()),
                output_field=DateTimeField(),
            )
        )

    def search(self, term):
        if not term:
            return self
        return self.filter(Q(title__icontains=term) | Q(project__name__icontains=term))
```

Ligado no model:

```python
class Labeling(models.Model):
    objects = LabelingQuerySet.as_manager()
```

E a view fica assim:

```python
qs = (
    Labeling.objects
    .for_annotator(request.user)
    .select_related("project")
    .with_annotator_stats(request.user)
    .with_last_opened(request.user)
    .search(request.query_params.get("search"))
)
```

**O ganho principal:** a ordenação por recência é escrita **uma vez** e os dois
dashboards (rotulador e gerenciamento) a compõem. Hoje seria código duplicado em
duas actions.

### 3.3 `services/` — **toda** escrita que passa de um model

Um pacote por app (`answer/services/` já existe). Uma função por operação de
negócio, nome no imperativo, `transaction.atomic` **aqui** e não na view.

```python
# answer/services/submit_answer.py
@transaction.atomic
def submit_answer(*, user, item, answer_payload) -> Answer:
    """Registra a resposta e propaga o efeito em item e rotulação."""
    answer = Answer.objects.create(...)
    _register_decision_vote(item, answer)
    _finalize_item_if_complete(item)
    _finalize_labeling_if_complete(item.labeling)

    # IO externo fora da transação — ver 5.4
    transaction.on_commit(lambda: maybe_run_llm_tiebreak(item))
    return answer
```

Candidatos prioritários para extração (todos hoje dentro de views):

| Operação | Onde está | Agregados que toca |
| --- | --- | --- |
| Responder item | `answer/views.py::AnswerViewset.create` | `Answer`, `Item`, `Labeling` + LLM |
| Convidar usuário | `user/views.py::InvitationViewSet.create` | `User`, `LabelingMembership`, `Invitation` + e-mail |
| Salvar estrutura do form | `labeling/views.py::CreateReadLabelingStructureView.put` | `LabelingSection`, `LabelingElement`, `MultipleChoiceItem`, `QuestionRange` |
| Próximo item / roubo de reserva | `item/views.py` | `Item`, `ItemMembership` + `select_for_update` |

Assinatura de serviço: **keyword-only** (`*,`), recebe objetos do domínio (não
`request`), devolve objeto do domínio (não `Response`). Serviço não conhece HTTP.

### 3.4 `permissions.py` — autorização

Continua onde está. **Serviço não é lugar de checagem de permissão.**

Dois `TODO` no repositório apontam código que pertence aqui:

- `answer/views.py:143` — checagem de `ItemMembership` dentro do `create`
  (`# TODO isso era pra trr na permission... T-T`).
- `labeling/views.py:593` — `GET` liberado para `IsAuthenticated` com ressalva.

### 3.5 `serializers.py` — formato, só formato

Validação de campo e formato de entrada/saída. **Sem** `transaction.atomic`, sem
constante de domínio, sem regra de negócio. Hoje `labeling/serializers.py` e
`project/serializers.py` importam as constantes do bot — isso sai.

### 3.6 `views.py` — só roteamento

Depois da refatoração, uma action de listagem deve caber em ~10 linhas:

```python
@action(detail=False, methods=["get"], url_path="dashboard",
        pagination_class=LabelingDashboardCursorPagination)
def dashboard(self, request):
    qs = (Labeling.objects
          .for_annotator(request.user)
          .with_annotator_stats(request.user)
          .with_last_opened(request.user)
          .search(request.query_params.get("search")))
    return paginated_response(self, qs, build_rows=annotator_dashboard_rows(request.user))
```

---

## 4. Estrutura de diretórios alvo

```
backend/
├── annotaise/
│   └── pagination.py          # StandardCursorPagination + paginated_response
├── labeling/
│   ├── models.py              # invariantes do agregado
│   ├── querysets.py           # ← NOVO: leitura
│   ├── services/              # ← NOVO: escrita
│   │   ├── __init__.py
│   │   └── structure.py
│   ├── permissions.py
│   ├── serializers.py
│   └── views.py               # magro
├── answer/
│   ├── querysets.py           # ← NOVO
│   └── services/              # já existe (llm_tiebreak.py)
│       └── submit_answer.py   # ← NOVO
├── item/ …  project/ …  user/ …
└── common/                    # ← NOVO: o que é de todos
    └── constants.py           # LLM_TIEBREAK_USERNAME / _EMAIL (hoje em 5 arquivos)
```

---

## 5. Pontos de atenção

### 5.1 Paginação por cursor — o mais fácil de quebrar

Todas as listagens usam `StandardCursorPagination` (`annotaise/pagination.py`).
O cursor guarda a **posição** na ordenação, não o número da página. Isso impõe
regras que não existiam na paginação por página:

1. **Devolva `QuerySet`, nunca `list`.** `paginated_response` fatia o queryset;
   uma lista Python carrega tudo em memória e perde o cursor.
2. **`ordering[0]` tem que ser um campo único, sem `__`.** O DRF levanta
   `assert '__' not in ordering`. Foi por isso que `AnswersDashboardView` anota
   `row_index=F("item__row_index")` em vez de ordenar por `item__row_index`.
3. **A coluna de ordenação não pode ser `NULL`.** O cursor filtra com
   `__lt`/`__gt`, e comparação com `NULL` nunca é verdadeira: as linhas com
   `NULL` **desaparecem silenciosamente a partir da segunda página**. Sempre
   `Coalesce(..., <sentinela>)`.
4. **Empate consome o `offset` do cursor, limitado a `offset_cutoff` (1000).**
   Todas as linhas com a mesma posição dividem um grupo de empate. Acima de ~1000
   empatadas, a paginação passa a pular registros. Use um desempate (`"-id"`) e
   evite ordenar por coluna de baixa cardinalidade.
5. **Ordenar por chave mutável causa salto/repetição.** `last_opened` muda quando
   o usuário abre uma rotulação; quem estava paginando volta e vê a lista
   remexida. Aceitável em lista curta, não em lista grande.

> ⚠️ `StandardCursorPagination.page_size` está em **2** no momento (valor de
> teste manual). O default de produção é **12** — confira antes de subir.

Ao criar uma listagem nova, escreva o teste de travessia junto: `annotaise/tests.py`
tem o helper `walk_cursor`, que segue o `next` até o fim e garante que nenhum
registro se perde ou repete.

### 5.2 Anotações: `Count` sofre fan-out, `Subquery` é melhor que `Max`

- **`Count` sobre relação multivalorada precisa de `distinct=True`.** Com dois
  `JOIN` multivalorados no mesmo queryset o produto cartesiano infla a contagem.
  Os `Count` dos dashboards já usam `distinct=True` — mantenha.
- **`Max` é imune a fan-out** (o maior de valores repetidos é o mesmo valor), mas
  **filtrar sobre agregado gera `HAVING`**, que nenhum índice ajuda.
- **Para escalar por usuário, prefira `Subquery(OuterRef(...))` a `Max`.** É o
  que `with_last_opened` faz: como `LabelingMembership` tem uma linha por
  (usuário, rotulação), a subquery escalar produz **`WHERE`** em vez de `HAVING`,
  não multiplica linhas e usa o índice `user_last_opened_idx`.

Ao adicionar anotação em queryset já anotado, verifique o SQL:

```python
print(str(qs.filter(sua_anotacao__lt=valor).query))   # tem HAVING? é sinal ruim
```

### 5.3 `build_rows` só vê a página corrente

`paginated_response(view, qs, build_rows=...)` chama `build_rows` **apenas com a
página atual**. Consequências:

- Agregados auxiliares devem ser buscados só para as linhas exibidas (colete os
  ids da página antes de consultar) — é o que evita varrer a rotulação inteira.
- **Se `build_rows` descartar linhas, a página vem com menos que `page_size` e o
  `count` passa a ser um teto.** É o caso do dashboard do rotulador, que remove
  rotulações com cota de grupo cheia. Quando isso acontece, **não exiba o total**
  na UI (ver `InfiniteScroll` sem `totalCount` em `app/(inside)/labelings/page.tsx`).

### 5.4 Transação e IO externo

- **Um `transaction.atomic` por entrada de serviço.** Não deixe transação na
  view nem no serializer.
- **Nada de e-mail, LLM ou HTTP dentro do bloco atômico.** Se a transação der
  rollback, o e-mail já foi. Use `transaction.on_commit(...)`.
- Serviço que chama serviço herda a transação do chamador — decida
  explicitamente se é isso que você quer.
- `select_for_update` (hoje em `item/views.py`) pertence ao serviço, junto da
  transação que o justifica.

### 5.5 `LabelingMembership` **não** é histórico de acesso

`LabelingMembership` governa **distribuição de item**: `LabelingViewSet.dashboard`
filtra por `memberships__user` **sem filtrar `role`**, e a tabela alimenta cotas
de grupo e a aba de atribuição.

> ❌ **Nunca crie `LabelingMembership` automaticamente** para registrar acesso,
> visita ou preferência. Um admin que só abriu a tela de gerenciamento passaria a
> aparecer no dashboard de rotulação, na lista de membros e na fila de
> distribuição de itens — inclusive com `role="viewer"`, porque o filtro não olha
> `role`.

Consequência prática já conhecida: o campo `LabelingMembership.last_opened_at`
existe apenas para quem **é membro**. Em uma amostra real, o dashboard de
gerenciamento mostrava 25 rotulações e o usuário tinha só 3 memberships — ou
seja, esse campo **não serve** para ordenar o dashboard de gerenciamento. Se for
preciso recência por usuário ali, o lugar é uma tabela de visita própria
(`user` + `labeling` + `last_opened_at`), não `LabelingMembership`.

### 5.6 O bot de desempate

`llm_tiebreak_bot` é um usuário real no banco e precisa ser escondido de toda
listagem de pessoas. Hoje as constantes estão em 5 arquivos e o `exclude` em 4.

Alvo: constantes em `common/constants.py` e **um** método de queryset:

```python
User.objects.humans()                      # em vez de dois .exclude() copiados
LabelingMembership.objects.humans()
```

Ao criar qualquer endpoint que liste usuários ou memberships, use o método. Se
esquecer, o bot aparece na UI.

### 5.7 Migrations

- Coluna nova em tabela com dados: `null=True, blank=True, default=None`. Sem
  default não-nulo em tabela grande (rewrite de tabela).
- Coluna usada em ordenação ou em `Subquery`: **crie o índice na mesma
  migration** (ex.: `user_last_opened_idx` em `(user, last_opened_at)`).
- Este app tem histórico de migrations paralelas com merge
  (`0028_merge_…`, `0031_merge_…`, `0036_merge_…`). Rode
  `makemigrations --check` antes de abrir PR e resolva merge localmente.

### 5.8 Exceção consciente: um `GET` que escreve

`LabelingViewSet.retrieve` grava `last_opened_at`. É uma violação deliberada de
"`GET` é seguro", escolhida porque **todas** as telas (resposta, background,
guia e gerenciamento) buscam esse detalhe antes de renderizar — então é o único
ponto que cobre deep link e refresh sem código no frontend.

O preço, que precisa estar documentado para quem mexer:

- O `QueryClient` do frontend não tem override, logo vale o default do
  react-query (`refetchOnWindowFocus: true`, `staleTime: 0`). Cada volta de foco
  numa aba de gerenciamento re-dispara o `GET` e **regrava** o timestamp. Na
  prática o campo significa "última visualização", não "último clique".
- Quem gerencia sem ser membro não grava nada (0 linhas no `update`) — é no-op
  esperado, não bug.

Se algum dia esse `GET` precisar ser cacheável ou servido por réplica de leitura,
esta é a primeira coisa a sair.

---

## 6. Frontend: o padrão já existe, mantenha

O frontend **já** faz a separação que o backend vai adotar. Preserve:

```
modules/<dominio>/
├── <dominio>Service.ts     # HTTP puro (axios), sem React
├── <dominio>Queries.ts     # leitura (useQuery / useCursorQuery)
├── <dominio>Mutations.ts   # escrita (useMutation + invalidateQueries)
└── <dominio>Types.ts
```

A página **não** chama `api.*` direto — sempre via hook.

Regras da listagem em scroll infinito (`modules/pagination.ts`,
`components/InfiniteScroll.tsx`):

1. Consuma `items` do `useCursorQuery`, **não** `data.results`.
2. **Filtro entra em `params`.** Trocar filtro troca a `queryKey`, o que descarta
   os blocos carregados e reinicia a lista sozinho — não existe mais
   `resetPage()` para chamar.
3. **A sentinela precisa estar *dentro* do container que rola.** O
   `IntersectionObserver` respeita o recorte dos ancestrais; sentinela fora da
   área rolável fica sempre visível e carrega a lista inteira de uma vez.
4. Só passe `totalCount` quando o `count` do backend for exato (ver 5.3).

---

## 7. Estratégia de migração

**Nada de big bang.** Abra o seam quando já estiver no arquivo por outro motivo.

| # | Passo | Risco | Ganho |
| --- | --- | --- | --- |
| 1 | `common/constants.py` + `objects.humans()` | mínimo | 5 arquivos → 1, valida o padrão de manager |
| 2 | `labeling/querysets.py` com `for_annotator` / `for_manager` / `with_*` | baixo | destrava ordenação compartilhada entre os 2 dashboards |
| 3 | `answer/services/submit_answer.py` | médio | tira 4 agregados + LLM da view |
| 4 | `labeling/services/structure.py` | médio | tira 170 linhas de upsert da APIView |
| 5 | Resolver os `TODO` de permissão | baixo | autorização volta para a camada certa |

Regra durante a transição: **código novo já nasce no padrão**; código antigo
migra quando for tocado. Não é aceitável adicionar lógica de domínio nova em
`views.py` ou `serializers.py`.

---

## 8. Checklist de PR

- [ ] Nenhuma regra de domínio nova em `views.py` ou `serializers.py`.
- [ ] Leitura devolve `QuerySet` (não `list`) e vive em `querysets.py`.
- [ ] Escrita multi-model vive em `services/`, com um `atomic` na entrada.
- [ ] IO externo (e-mail, LLM, HTTP) fora do bloco atômico, via `on_commit`.
- [ ] Autorização em `permissions.py`, não no corpo da view nem no serviço.
- [ ] Listagem nova: ordenação sem `__`, sem `NULL` (`Coalesce`), com desempate,
      e com teste de travessia de cursor.
- [ ] `Count` sobre relação multivalorada usa `distinct=True`.
- [ ] Se `build_rows` descarta linha, a UI não exibe total.
- [ ] Listagem de pessoas passa por `humans()`.
- [ ] Migration com índice para coluna de ordenação; `makemigrations --check` limpo.
- [ ] Nenhum `LabelingMembership` criado para registrar acesso.
