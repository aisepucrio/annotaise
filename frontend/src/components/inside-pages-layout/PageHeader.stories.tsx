import type { Meta, StoryObj } from '@storybook/nextjs';
import PageHeader from './PageHeader';

const meta = {
  title: 'InsidePages/PageHeader',
  component: PageHeader,
  tags: ['autodocs'],
  args: {
    page_title: 'Título da Página',
    description: 'Esta é uma descrição da página',
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof PageHeader>;

export default meta;

/* =======================
   PLAYGROUND
======================= */

export const Playground: StoryObj<typeof PageHeader> = {
  parameters: {
    docs: {
      description: {
        story: `
PageHeader editável.

Use os controles para testar diferentes **títulos**, **descrições** e **tooltips**.
        `,
      },
    },
  },
};

/* =======================
   VARIAÇÕES
======================= */

export const Variations: StoryObj<typeof PageHeader> = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-gray-600 mb-2 ml-5">Apenas título</p>
        <PageHeader page_title="Dashboard" />
      </div>

      <div>
        <p className="text-sm text-gray-600 mb-2 ml-5">Com descrição</p>
        <PageHeader page_title="Projetos" description="Gerencie seus projetos de anotação" />
      </div>

      <div>
        <p className="text-sm text-gray-600 mb-2 ml-5">Com tooltip</p>
        <PageHeader
          page_title="Configurações"
          description="Configure as preferências do sistema"
          tooltip="Aqui você pode ajustar todas as configurações da aplicação"
        />
      </div>

      <div>
        <p className="text-sm text-gray-600 mb-2 ml-5">Completo (título, descrição e tooltip)</p>
        <PageHeader
          page_title="Usuários"
          description="Gerencie usuários e permissões"
          tooltip="Visualize e edite informações de todos os usuários do sistema"
        />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: `
### Variações do PageHeader

- **Apenas título**: Versão mínima com só o título
- **Com descrição**: Adiciona contexto abaixo do título
- **Com tooltip**: Fornece informação adicional ao passar o mouse
- **Completo**: Todas as propriedades juntas
        `,
      },
    },
  },
};

/* =======================
   DIFERENTES TAMANHOS DE TÍTULO
======================= */

export const TitleLengths: StoryObj<typeof PageHeader> = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-gray-600 mb-2 ml-5">Título curto</p>
        <PageHeader page_title="Dashboard" description="Visão geral das métricas" />
      </div>

      <div>
        <p className="text-sm text-gray-600 mb-2 ml-5">Título médio</p>
        <PageHeader page_title="Gerenciamento de Projetos" description="Acompanhe o progresso dos seus projetos" />
      </div>

      <div>
        <p className="text-sm text-gray-600 mb-2 ml-5">Título longo</p>
        <PageHeader
          page_title="Sistema de Gestão e Anotação de Dados Complexos"
          description="Plataforma completa para anotação colaborativa de grandes volumes de dados"
        />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: `
Exemplos com diferentes tamanhos de título para verificar o comportamento responsivo do componente.
        `,
      },
    },
  },
};

/* =======================
   CONTEXTOS DE USO
======================= */

export const UsageContexts: StoryObj<typeof PageHeader> = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-gray-600 mb-2 ml-5">Página inicial</p>
        <PageHeader
          page_title="Dashboard"
          description="Bem-vindo de volta! Aqui está um resumo das suas atividades"
          tooltip="Visualize métricas e estatísticas gerais"
        />
      </div>

      <div>
        <p className="text-sm text-gray-600 mb-2 ml-5">Página de listagem</p>
        <PageHeader page_title="Anotações" description="123 anotações encontradas" />
      </div>

      <div>
        <p className="text-sm text-gray-600 mb-2 ml-5">Página de criação</p>
        <PageHeader
          page_title="Novo Projeto"
          description="Preencha os dados abaixo para criar um novo projeto"
          tooltip="Todos os campos marcados com * são obrigatórios"
        />
      </div>

      <div>
        <p className="text-sm text-gray-600 mb-2 ml-5">Página de detalhes</p>
        <PageHeader
          page_title="Projeto: Análise de Sentimentos"
          description="Criado em 15/01/2026 • Última atualização há 2 horas"
          tooltip="Clique no ícone de configurações para editar"
        />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: `
### Contextos de uso real

Exemplos de como o PageHeader pode ser usado em diferentes tipos de páginas:
- **Dashboard**: Página inicial com boas-vindas
- **Listagem**: Mostrando contadores de resultados
- **Criação**: Instruindo o usuário sobre formulários
- **Detalhes**: Exibindo metadados e informações contextuais
        `,
      },
    },
  },
};
