# Guia do Usuário: AnnotAISE

Este guia foi desenvolvido para orientar gestores e pesquisadores na utilização do AnnotAISE, uma plataforma para anotação de dados. O documento detalha todo o fluxo de trabalho, garantindo a criação de datasets validados e prontos para o treinamento de modelos de Inteligência Artificial.

## 1. Conceitos essenciais

- **Dataset:** O arquivo CSV importado para uma rotulação, contendo os dados brutos que serão anotados. Cada linha do dataset se torna um item independente dentro da plataforma.
- **Rotulação:** Uma tarefa de anotação específica, criada a partir da importação de um dataset. Define o formulário, o cronograma e as regras de validação que os anotadores seguirão.
- **Item:** Linha do CSV (dataset) importado. Cada item necessita de uma validação (rotulação) e é distribuído aos anotadores conforme a estratégia definida.
- **Contexto:** Coluna do CSV vinculada a um campo de dado do formulário. É a informação de referência exibida ao anotador (ex.: um trecho de código, uma imagem, um texto).
- **Decisão (agreement):** Certas rotulações possuem uma pergunta de múltipla escolha definida como decisiva para classificar um item. Quando a decisão automática está ativada, o item continua em circulação mesmo após atingir o número de "usuários por item", até que uma opção atinja maioria estrita entre as respostas.
- **Desempate por LLM:** Mecanismo opcional acionado quando um empate persiste entre os anotadores humanos na pergunta decisiva. Múltiplos modelos de linguagem avaliam o item e a opção mais votada entre eles é registrada como decisão final.
- **Grupo:** Conjunto de usuários agrupados sob um mesmo rótulo. Facilita a atribuição em equipes maiores, permitindo conceder acesso a uma rotulação para todos os membros do grupo de uma só vez, sem precisar adicioná-los individualmente.

## 2. Como funciona o AnnotAISE

Nesta seção, será apresentada uma visão geral e detalhada de todas as abas que compõem a navegação principal da plataforma. O objetivo é explicar as funcionalidades de cada uma, orientando o usuário sobre como navegar pelo sistema e utilizar suas ferramentas de forma eficiente.

### 2.1 Aba de Usuários

Esta aba é exclusiva para administradores e serve como o centro de controle de acesso à plataforma. Ela permite o gerenciamento completo do ciclo de vida dos usuários no sistema.

![Aba de Usuários, com os cartões de cada usuário cadastrado](/docs/img/aba-usuarios.png)

#### 2.1.1 Convite de Novos Usuários

É possível expandir a equipe enviando convites diretamente para os e-mails dos novos colaboradores. No momento do convite, o administrador define o nível de privilégio da conta:

- **Administrador:** possui acesso total às configurações do sistema e gerenciamento de outros usuários (exceto outros admins).
- **Usuário Padrão:** acesso focado na execução de rotulações e participação em projetos específicos.

> É possível adicionar múltiplos endereços de e-mail de uma só vez, separando-os por vírgulas, quebras de linha ou espaços em branco, desde que todos recebam o mesmo tipo de conta e o convite seja enviado no mesmo idioma. Também é possível atribuir automaticamente o usuário a um projeto e/ou a uma rotulação.

![Modal de convite de novo usuário](/docs/img/novo-usuario.png)

#### 2.1.2 Gerenciamento de Contas

A aba oferece uma visão geral de todos os usuários já cadastrados, permitindo a edição e atualização constante de informações essenciais. O administrador pode:

- Atualizar dados básicos, como nome, sobrenome e e-mail.
- Alterar o tipo de conta, promovendo um usuário a administrador ou vice-versa.
- Adicionar o usuário a um grupo já existente ou digitar um novo nome para criar um novo grupo.
- Excluir o usuário da plataforma.

![Modal de edição de usuário](/docs/img/editar-usuario.png)

### 2.2 Aba de Projetos

Esta aba centraliza a visualização e o controle de todas as rotulações da plataforma, permitindo o acompanhamento em tempo real de cada ciclo de rotulação. É exclusiva para administradores.

![Aba de Projetos](/docs/img/aba-projetos.png)

#### 2.2.1 Indicadores de Desempenho

A interface exibe métricas críticas para a gestão, permitindo verificar de imediato o número de usuários ativos, a quantidade de rotulações em andamento e o total de rotulações finalizadas e validadas.

#### 2.2.2 Criação de Novos Projetos

O campo "Novo Projeto" serve como o ponto de partida de todo o fluxo de trabalho, onde são definidas as diretrizes iniciais para o processo.

#### 2.2.3 Gerenciamento

Ao acessar "Gerenciar", é possível realizar ajustes e atualizações no projeto:

- Atualização de dados fundamentais como nome, descrição e o status atual do projeto.
- Gestão completa da equipe vinculada ao projeto, permitindo visualizar os membros atuais, adicionar novos colaboradores ou excluir acessos existentes.
- Definição personalizada do nível de autoridade de cada integrante, garantindo que cada pessoa possua as permissões adequadas às suas responsabilidades.

### 2.3 Aba de Gerenciar Rotulações

Esta aba é o espaço onde se definem as regras específicas para a coleta de respostas e o processamento dos datasets. É exclusiva para administradores.

![Aba de Gerenciar Rotulações](/docs/img/gerenciar-rotulacoes.png)

#### 2.3.1 Criação e Importação

O botão "Nova Rotulação" inicia o processo, permitindo a importação de datasets e a configuração inicial dos parâmetros de análise.

> É possível escolher a opção "Apenas formulário (sem importar itens)" se você quiser criar um formulário complementar que não precise da importação de um dataset.

#### 2.3.2 Monitoramento de Prazos e Acompanhamento de Metas

O sistema calcula e exibe o número de dias passados com base nas datas de início e fim estabelecidas. Isso permite um controle sobre o cronograma e o ritmo de trabalho da equipe. Também é possível verificar o número de rotulações concluídas em relação à quantidade total desejada. Esse indicador ajuda a identificar o progresso real da tarefa e quanto falta para atingir o quórum de validação definido.

#### 2.3.3 Gestão do Ciclo de Formulário

Ao clicar em "Gerenciar" em uma rotulação específica, o administrador acessa um painel completo, organizado em abas: **Formulário**, onde se define a estrutura de seções, campos de dado e perguntas; **Atribuir usuários** e **Atribuir grupos**, que controlam quem tem acesso à rotulação; **Respostas**, com o dashboard de estatísticas, agreement e exportação; **Guia**, para a criação do documento de orientações; e **Decisão**, onde se configuram os parâmetros de consenso e resolução de empates.

Cada uma dessas etapas é detalhada, com o passo a passo de utilização, na Seção 3.

### 2.4 Aba de Rotular

Esta é a aba de resposta e a única acessível tanto para Administradores quanto para Usuários Padrão. Ela funciona como o ambiente de trabalho direto, onde as rotulações são efetivamente executadas.

#### 2.4.1 Acesso às Tarefas

Nesta página, são listadas todas as rotulações às quais o usuário está associado. Ou seja, o usuário visualiza apenas as rotulações que foram atribuídas a ele pelo proprietário.

#### 2.4.2 Execução de Respostas

Ao selecionar a rotulação desejada, o usuário visualiza o formulário definido e registra suas respostas conforme as orientações estabelecidas.

![Tela de rotulação, com o formulário à esquerda e o guia à direita](/docs/img/aba-rotular.png)

#### 2.4.3 Estatísticas

Além de responder, o usuário pode acompanhar o seu progresso pessoal dentro de cada rotulação, visualizando o volume de itens já concluídos e o que ainda resta para atingir a meta daquela tarefa.

## 3. Como utilizar o AnnotAISE

### 3.1 Como cadastrar um trabalho de anotação de dados

#### 3.1.1 Passo um

Comece acessando a aba de "Projetos", o centro de controle da plataforma. **Toda atividade de rotulação deve estar vinculada a um projeto** para garantir a organização dos dados.

**Criação:** ao clicar em "Novo Projeto", defina um nome, uma descrição clara e o status (que pode ser atualizado conforme o progresso da pesquisa).

![Modal de criação de projeto](/docs/img/novo-projeto.png)

**Equipe e permissões:** após a criação, clique em "Gerenciar" para adicionar membros e definir o nível de acesso de cada um:

- **Proprietário:** controle total sobre configurações, membros e exclusão.
- **Colaborador:** pode criar rotulações e gerenciar dados.
- **Visualizador:** acompanha apenas progresso, relatórios e estatísticas.

![Tela de informações e membros do projeto](/docs/img/membros-projeto.png)

#### 3.1.2 Passo dois

Com o projeto criado, acesse a aba "Gerenciar Rotulações" para preparar o ambiente de trabalho dos rotuladores.

**Importação de dados:** após clicar em "Nova Rotulação", anexe seu dataset com os itens a serem analisados.

![Modal de importação de CSV](/docs/img/nova-rotulacao-upload.png)

**Identificação:** defina um título e vincule a rotulação ao seu projeto.

**Cronograma:** estabeleça datas de início e término para controle de prazos.

**Validação e consenso:**

- **Estratégia de distribuição:** define como os itens serão distribuídos entre os rotuladores (Automático, por pessoa ou modo anônimo).
- **Decisão automática:** ative para que o sistema resolva automaticamente casos de empate nas respostas. É possível escolher se essa decisão será feita manualmente ou por LLM.
- **Usuários por item:** define quantas pessoas devem responder ao mesmo item para que seja considerado válido.
- **Atribuir grupos:** permite atribuir grupos já criados à rotulação e definir a quantidade de itens que cada usuário de cada grupo deve responder.
- **Formulário de background:** ative para incluir um questionário de perfil e coletar informações sobre o rotulador, como nível de experiência, formação ou familiaridade com o tema.

![Modal de nova rotulação, com os campos de validação e consenso](/docs/img/nova-rotulacao-config1.png)

![Modal de nova rotulação, com os campos de validação e consenso](/docs/img/nova-rotulacao-config2.png)


#### 3.1.3 Passo três

Após a criação da rotulação, clique em "Gerenciar" para configurar a interface de resposta. Esta etapa define como os dados serão apresentados e coletados.

##### Formulário

- **Organização em seções:** estruture a rotulação em uma ou mais seções, conforme a organização desejada. Utilize cada seção como um bloco independente de análise.
- **Definição do contexto:** vincule, para cada seção, uma coluna do dataset que servirá de base informativa. Os tipos de contexto existentes são Texto, Imagem, Número, Categoria, Data, Código, Áudio, Vídeo e PDF. Use este recurso para exibir dados variados em diferentes etapas do formulário e garantir a renderização adequada ao formato original do dado.
- **Criação de perguntas:** formule as perguntas da rotulação e defina a obrigatoriedade de cada uma para assegurar que o dataset final seja completo. Escolha o modelo de entrada mais apropriado para cada pergunta (Texto Simples, Números, Intervalo Numérico, Seleção Múltipla ou Checkbox).

![Editor de formulário, com seção, contexto e pergunta](/docs/img/formulario1.png)

![Editor de formulário, com seção, contexto e pergunta](/docs/img/formulario2.png)


##### Atribuir usuários

Defina quais membros terão acesso a esta rotulação. Os Rotuladores poderão responder à rotulação, enquanto os Administradores poderão acessá-la, editá-la e gerenciá-la. Apenas os membros selecionados poderão visualizar essa rotulação na aba "Rotular".

##### Atribuir grupos

Permite conceder acesso à rotulação para um grupo inteiro de usuários de uma só vez, agilizando a atribuição em equipes maiores.

##### Respostas

Esta aba reúne todo o histórico de respostas coletadas na rotulação, oferecendo formas complementares de visualização.

Na visualização por **Respostas**, é possível consultar cada item individualmente, acompanhando as respostas dadas por cada rotulador. As respostas podem ser filtradas por usuário, permitindo revisar o trabalho de um rotulador específico. Através do botão "Inspecionar", o administrador visualiza todas as respostas registradas para aquele item lado a lado, permitindo comparar diretamente como diferentes rotuladores avaliaram o mesmo trecho de dado.

![Visualização por respostas, com os itens e o botão Inspecionar](/docs/img/respostas.png)

O **Resumo das respostas** oferece uma visão consolidada de toda a rotulação: para cada pergunta do formulário, o sistema apresenta a distribuição das respostas mais frequentes, além de médias e outras análises gerais que ajudam a identificar padrões no dataset como um todo. É nesta visão também que se acompanha o indicador de concordância (agreement) entre os anotadores, mostrando o percentual de itens em que um mínimo de rotuladores convergiu para a mesma resposta.

![Resumo das respostas, com distribuição e agreement](/docs/img/resumo-respostas.png)

##### Guia

O proprietário pode elaborar e disponibilizar um guia com instruções claras para os rotuladores. Este documento é fundamental para padronizar os critérios de análise e reduzir a subjetividade nas respostas.

![Editor do guia de rotulação, com Markdown à esquerda e pré-visualização à direita](/docs/img/guia-rotulacao.png)

##### Decisão

Se a decisão automática estiver habilitada, escolha a pergunta de múltipla escolha que será utilizada como critério para definir automaticamente a decisão final.

Caso um empate persista entre os anotadores humanos mesmo após o número necessário de respostas, e o modo de decisão automática esteja configurado para LLM (desempate), o sistema aciona múltiplos modelos de linguagem para avaliar o item de forma independente. Cada modelo analisa o contexto e a pergunta decisiva e escolhe uma das opções válidas. A opção mais votada entre os modelos é registrada como a decisão final daquele item, e é identificada no dashboard como uma decisão gerada por LLM.