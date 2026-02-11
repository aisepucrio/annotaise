# Frontend Modules

Este diretório agrupa a camada de dados por dominio do app. Cada modulo representa uma secao do produto e segue a mesma organizacao das rotas internas, especialmente as ramificacoes que aparecem no sidebar.

A estrutura abaixo e relativa a `frontend/src/modules`.

## Estrutura de pastas

- `labelings/`: dominio de labelings (sidebar: Labelings e Manage Labelings)
- `labelings/create/`: ramificacao de criacao/gestao de labelings (rotas como `/labelings/create/[id]` e fluxos de configuracao)
- `projects/`: dominio de projetos (sidebar: Projects)
- `user/`: dominio de usuarios (sidebar: Users)

Arquivos padrao por modulo:

- `*Service.ts`: funcoes HTTP usando o client `api`
- `*Queries.ts`: hooks `useQuery` do React Query
- `*Mutations.ts`: hooks `useMutation` do React Query
- `*Types.ts`: tipos e DTOs do dominio

## Conceitos

- Service: camada de comunicacao com a API. Sao funcoes puras (sem React) que fazem chamadas HTTP e retornam dados tipados. Ex.: `fetchProjects()`, `createUser(payload)`.
- Query: leitura de dados com cache via React Query. Fica em `*Queries.ts`, usa `useQuery`, define `queryKey` e chama um service. Ex.: `useProjectsQuery()`.
- Mutation: escrita/alteracao de dados via React Query. Fica em `*Mutations.ts`, usa `useMutation`, chama um service e invalida caches relacionados no `onSuccess`. Ex.: `useUpdateUserMutation(userId)`.
- Type: tipos/DTOs do dominio usados para tipar payloads e respostas. Fica em `*Types.ts`. Ex.: `ProjectPayload`, `User`.
