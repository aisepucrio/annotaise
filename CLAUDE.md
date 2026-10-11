# Annotaise

Collaborative data-labeling platform. Admins create **projects** and **labelings**
(annotation tasks), import **items** via CSV, invite users as annotators, and collect
their **answers** per item. Also: dashboards (user / project / labeling),
inter-annotator agreement summaries, LLM tiebreak, and CSV export.

Layout: [backend/](backend/) — Django REST API · [frontend/](frontend/) — Next.js client.

## Stack

**Backend** — Python 3.13 (`uv`), Django 5.2 + DRF 3.16, SimpleJWT (`Authorization: Bearer`),
drf-spectacular, django-filter, django-cors-headers, django-health-check, PostgreSQL via
psycopg (SQLite fallback when `DJANGO_DB_NAME` is unset), pandas for CSV, Gunicorn + Docker
([run.sh](backend/run.sh)).
Apps: `annotaise` (config), `authentication`, `user`, `project`, `labeling`, `item`, `answer`.
User model `user.CustomUser`; login by email via `authentication.backends.EmailBackend`.

**Frontend** — Next.js 15 (App Router, Turbopack), React 19, TypeScript 5, Tailwind 4,
TanStack Query, axios + axios-auth-refresh, react-hook-form, next-intl, next-themes,
Radix Dialog, lucide-react, sonner, @dnd-kit, react-markdown, js-cookie,
Storybook 10 + Vitest 4 + Playwright. Source: [frontend/src/](frontend/src/).

## Running

```bash
# backend/
uv sync && uv run manage.py migrate && uv run manage.py runserver 0.0.0.0:8000
# frontend/
npm install && npm run dev          # http://localhost:3000
```

Routes are mounted in [backend/annotaise/urls.py](backend/annotaise/urls.py); the live
contract is `/api/docs/` (Swagger) and `/api/schema/`. Default permission: `IsAuthenticated`.

---

# Design pattern (backend)

Source of truth: [designpattern.md](designpattern.md). New code is born this way; old code
migrates when it gets touched.

```
HTTP → View        routes: permission, serializer, calls queryset or service
       Permission  authorizes
       Serializer  input/output format
       QuerySet    composable reads (returns a QuerySet)
       Service     computation and writes (returns domain data)
       Model       invariants of a single aggregate
```

## Layers

1. **The view decides nothing about the domain** (except trivial or already-implemented
   viewset methods). It deserializes, calls, serializes, returns a status. No business rules
   in `views.py` or `serializers.py`.
2. **Authorization lives in `permissions.py`**, nowhere else.
3. **`models.py`** only holds what depends on the object itself and its direct children
   (`Item.remaining_groups`). No external IO, no cross-aggregate orchestration.
4. **`serializers.py`** only field and format validation. No `transaction.atomic`,
   no domain constants.

## Services

Reference: [backend/labeling/services/agreement.py](backend/labeling/services/agreement.py).
One package per app, an `__init__.py`, one module per operation.

5. **Plain functions, not classes.** The module is already the namespace. Use a class only
   when there is state across calls, or more than one implementation of the same interface.
6. **Takes domain objects, not `request`.** Returns a `dict` or a model, not a `Response`.
   Private helpers get the `_` prefix.
7. **No `request` / `Response` / `status` / permission checks inside a service.** Accepted
   exception: raising DRF's `ValidationError`, which preserves the `400` with its `code`
   without writing a translation layer in the view.
8. **`transaction.atomic` at the service entry point** — never in the view, never in the
   serializer. A service calling another service inherits the caller's transaction.
   `select_for_update` belongs next to the transaction that justifies it.
9. **External IO (email, LLM, HTTP) goes outside the atomic block**, via
   `transaction.on_commit(...)`. A rollback does not un-send an email.
10. Goes into a service: computation longer than ~20 lines, external IO.

## Querysets

11. **Basic reads, and reads that make sense in domain terms, belong to a `QuerySet`** —
    always chainable from `self`, never a `list`.

```python
class AnswerQuerySet(QuerySet):

    def done_count_by_user(self):
        """(answered_by_id, distinct items answered), from the current slice."""
        return (
            self.values_list("answered_by_id")
            .annotate(total=Count("item", distinct=True))
            .values_list("answered_by_id", "total")
        )


class Answer(models.Model):
    objects = AnswerQuerySet.as_manager()
```

12. **`Count` over a multi-valued relation needs `distinct=True`.** Two multi-valued JOINs
    in the same queryset inflate the count by cartesian product.
13. **Do not filter on an aggregate** — it produces `HAVING`, which no index helps. Prefer
    `Subquery(OuterRef(...))` over `Max`. Check it:
    `print(str(qs.filter(annot__lt=v).query))`.
14. **Pagination is cursor-based** — [`StandardCursorPagination`](backend/annotaise/pagination.py),
    `page_size=12`, ordered by `-id`, via `paginated_response(view, qs, serializer_class=None,
    build_rows=None)`. Pass a `QuerySet`, not a `list` — a `list` skips the cursor entirely and
    returns everything unpaginated. Use `build_rows` to shape rows, so per-row aggregates only
    run for the current page.

## Domain (rules that already cost us bugs)

15. **Never create a `LabelingMembership` to record access.** It governs item distribution,
    and the dashboard filters by `memberships__user` **without looking at `role`** — an admin
    who merely opened the management screen becomes a member and enters the queue. If you need
    last-access recency, that is its own table.
16. **Any listing of people hides `llm_tiebreak_bot`.** It is a real user. Today the constants
    are duplicated across 5 files (`labeling/`, `project/`, `user/`); the target is
    `common/constants.py` plus `User.objects.humans()` instead of a copy-pasted `.exclude()`.

## Frontend

Unspecified — [designpattern.md](designpattern.md) leaves this section open (`???`).
Follow the conventions of the surrounding `frontend/src/modules/*` code until it is written.
