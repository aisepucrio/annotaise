# Design Pattern — Annotaise

Requisitos de design do backend. Código novo já nasce assim; código antigo migra
quando for tocado.

```
HTTP → View        roteia: permission, serializer, chama queryset ou service
       Permission  autoriza
       Serializer  formato de entrada/saída
       QuerySet    leitura componível (devolve QuerySet)
       Service     cálculo e escrita (devolve dado do domínio)
       Model       invariantes de um agregado só
```

## Camadas

1. **View não decide nada de domínio. (exceto métodos simples ou já implementados de viewsets)** Desserializa, chama, serializa, devolve status. Nada de regra de negócio em `views.py` ou `serializers.py`.
2. **Autorização mora em `permissions.py`**, em lugar nenhum mais.
3. **`models.py`** só o que depende do próprio objeto e filhos diretos (`Item.remaining_groups`). Nada de IO externo ou orquestração entre agregados.
4. **`serializers.py`** só validação de campo e formato. Sem `transaction.atomic`, sem constante de domínio.

## Services

Referência: [labeling/services/agreement.py](annotaise/backend/labeling/services/agreement.py). Pacote por app, `__init__.py`, um módulo por operação.

5. **Funções soltas, não classes.** O módulo já é o namespace. Classe só com estado entre chamadas ou mais de uma implementação da mesma interface.
6. **Recebe objeto de domínio, não `request`.** Devolve `dict` ou model, não `Response`. Privados com prefixo `_`.
7. **Sem `request` / `Response` / `status` / permissão** dentro do serviço. Exceção aceita: `ValidationError` do DRF, para preservar o `400` com `code` sem escrever tradutor na view.
8. **`transaction.atomic` na entrada do serviço** — nunca na view, nunca no serializer. Serviço que chama serviço herda a transação. `select_for_update` junto da transação que o justifica.
9. **IO externo (e-mail, LLM, HTTP) fora do bloco atômico**, via `transaction.on_commit(...)`. Rollback não desfaz e-mail enviado.
10. Vai para service: cálculo de mais de ~20 linhas, IO externo.

## Querysets

11. **Leituras básicas ou que fazem sentida no contexto do domínio são feitas por `QuerySet`**, sempre encadeável a partir de `self` — nunca `list`

```python
class AnswerQuerySet(QuerySet):

    def done_count_by_user(self):
        """(answered_by_id, itens distintos respondidos), a partir do recorte atual."""
        return (
            self.values_list("answered_by_id")
            .annotate(total=Count("item", distinct=True))
            .values_list("answered_by_id", "total")
        )


class Answer(models.Model):
    objects = LabelingQuerySet.as_manager()
```

12. **`Count` sobre relação multivalorada usa `distinct=True`.** Dois JOINs multivalorados no mesmo queryset inflam a contagem por produto cartesiano.
13. **Não filtre sobre agregado** — gera `HAVING`, que índice nenhum ajuda. Prefira `Subquery(OuterRef(...))` a `Max`. Confira: `print(str(qs.filter(anot__lt=v).query))`.
14. Paginação por página (`StandardPageNumberPagination`, 12) via `paginated_response(view, qs, serializer_class=None)`.

## Domínio (regras que já custaram bug)

15. **Nunca criar `LabelingMembership` para registrar acesso.** Ela governa distribuição de item e o dashboard filtra por `memberships__user` **sem olhar `role`** — um admin que só abriu a tela de gerenciamento vira membro e entra na fila. Recência de acesso, se precisar, é tabela própria.
16. **Listagem de pessoas esconde `llm_tiebreak_bot`.** É usuário real. Hoje as constantes estão duplicadas em 5 arquivos (`labeling/`, `project/`, `user/`); alvo é `common/constants.py` + `User.objects.humans()` em vez de `.exclude()` copiado.

## Frontend

???
