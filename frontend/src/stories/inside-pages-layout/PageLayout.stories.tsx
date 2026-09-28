import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Tag } from 'lucide-react';
import PageLayout from '@/components/inside-pages-layout/PageLayout';
import GridItemCard from '@/components/grid/GridItemCard';
import Button from '@/components/button/Button';

const meta = {
  title: 'InsidePages/PageLayout',
  component: PageLayout,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof PageLayout>;

export default meta;

/* =======================
   BASIC EXAMPLE
======================= */

export const Basic: StoryObj<typeof PageLayout> = {
  args: {
    pageTitle: 'Meus projetos',
    description: 'Veja e gerencie todos os seus projetos',
    searchPlaceholder: 'Buscar projetos...',
    filterButtonText: 'Filtrar',
    children: (
      <>
        <GridItemCard index={0}>
          <div className="p-4 bg-white rounded-lg">
            <h3 className="font-semibold">Projeto Alpha</h3>
            <p className="text-sm text-gray-600">5 tarefas pendentes</p>
          </div>
        </GridItemCard>
        <GridItemCard index={1}>
          <div className="p-4 bg-white rounded-lg">
            <h3 className="font-semibold">Projeto Beta</h3>
            <p className="text-sm text-gray-600">12 tarefas concluídas</p>
          </div>
        </GridItemCard>
        <GridItemCard index={2}>
          <div className="p-4 bg-white rounded-lg">
            <h3 className="font-semibold">Projeto Gamma</h3>
            <p className="text-sm text-gray-600">3 tarefas em andamento</p>
          </div>
        </GridItemCard>
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: `
Layout básico com título, descrição, busca e grid de items.

A busca possui **debounce automático** de 300ms.
        `,
      },
    },
  },
};

/* =======================
   WITH ACTION BUTTON
======================= */

export const WithActionButton: StoryObj<typeof PageLayout> = {
  args: {
    pageTitle: 'Usuários',
    description: 'Gerencie usuários do sistema e permissões',
    tooltip: 'Criar, editar e excluir usuários',
    searchPlaceholder: 'Buscar usuários...',
    filterButtonText: 'Filtrar',
    hasButton: true,
    buttonText: 'Novo usuário',
    children: (
      <>
        <GridItemCard index={0}>
          <div className="p-4 bg-white rounded-lg">
            <h3 className="font-semibold">John Doe</h3>
            <p className="text-sm text-gray-600">john@example.com</p>
          </div>
        </GridItemCard>
        <GridItemCard index={1}>
          <div className="p-4 bg-white rounded-lg">
            <h3 className="font-semibold">Jane Smith</h3>
            <p className="text-sm text-gray-600">jane@example.com</p>
          </div>
        </GridItemCard>
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: `
Layout com botão de ação no canto superior direito.

Use \`hasButton={true}\` para exibir o botão. Configure texto, ícone e callbacks.
        `,
      },
    },
  },
};

/* =======================
   STATES: LOADING
======================= */

export const Loading: StoryObj<typeof PageLayout> = {
  args: {
    pageTitle: 'Rotulações',
    description: 'Todas as suas tarefas de rotulação',
    searchPlaceholder: 'Buscar rotulações...',
    filterButtonText: 'Filtrar',
    isLoading: true,
    children: null,
  },
  parameters: {
    docs: {
      description: {
        story: `
Estado de **carregamento**.

Use \`isLoading={true}\` para exibir o loader.
        `,
      },
    },
  },
};

/* =======================
   STATES: EMPTY
======================= */

export const Empty: StoryObj<typeof PageLayout> = {
  args: {
    pageTitle: 'Projetos',
    description: 'Nenhum projeto encontrado',
    searchPlaceholder: 'Buscar projetos...',
    filterButtonText: 'Filtrar',
    message: 'Nenhum projeto disponível. Crie seu primeiro projeto!',
    children: null,
  },
  parameters: {
    docs: {
      description: {
        story: `
Estado **vazio** quando não há dados.

Use \`message\` para exibir um texto quando não houver dados.
        `,
      },
    },
  },
};

/* =======================
   COM INFO TEXT
======================= */

export const WithInfoText: StoryObj<typeof PageLayout> = {
  args: {
    pageTitle: 'Rotulações',
    description: 'Veja suas tarefas de rotulação atribuídas',
    searchPlaceholder: 'Buscar rotulações...',
    filterButtonText: 'Filtrar',
    children: (
      <>
        <GridItemCard index={0}>
          <div className="p-4 bg-white rounded-lg">
            <h3 className="font-semibold">Tarefa nº 1</h3>
            <p className="text-sm text-gray-600">50% concluída</p>
            <p className="mt-2 text-xs text-amber-700">Nota: Somente administradores podem criar e editar rotulações.</p>
          </div>
        </GridItemCard>
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: `
Layout com **texto informativo** exibido abaixo da grid.

Útil para avisos, notas ou instruções adicionais.
        `,
      },
    },
  },
};

/* =======================
   CUSTOM GRID
======================= */

export const CustomGridWidth: StoryObj<typeof PageLayout> = {
  args: {
    pageTitle: 'Itens largos',
    description: 'Grade com largura mínima de coluna maior',
    searchPlaceholder: 'Buscar itens...',
    filterButtonText: 'Filtrar',
    minColumnWidth: '600px',
    children: (
      <>
        <GridItemCard index={0}>
          <div className="p-6 bg-white rounded-lg">
            <h3 className="font-semibold text-lg">Item largo 1</h3>
            <p className="text-sm text-gray-600">Esta grade tem largura mínima de coluna de 600px</p>
          </div>
        </GridItemCard>
        <GridItemCard index={1}>
          <div className="p-6 bg-white rounded-lg">
            <h3 className="font-semibold text-lg">Item largo 2</h3>
            <p className="text-sm text-gray-600">Os itens ficarão mais largos</p>
          </div>
        </GridItemCard>
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: `
Personalize a largura mínima das colunas da grade usando \`minColumnWidth\`.

Padrão: **420px**. Ajuste conforme o conteúdo dos cards para obter melhor legibilidade.
        `,
      },
    },
  },
};

/* =======================
   COMPLETE EXAMPLE
======================= */

export const Complete: StoryObj<typeof PageLayout> = {
  args: {
    pageTitle: 'Painel de rotulações',
    description: 'Gerencie e acompanhe todas as tarefas de rotulação',
    tooltip: 'Ver progresso e atribuir tarefas',
    searchPlaceholder: 'Buscar por projeto ou nome da rotulação...',
    filterButtonText: 'Filtrar',
    hasButton: true,
    buttonText: 'Nova rotulação',
    buttonDisabled: false,
    minColumnWidth: '420px',
    children: (
      <>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <GridItemCard key={i} index={i - 1}>
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold">Tarefa de rotulação {i}</h3>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Ativa</span>
              </div>
              <p className="text-sm text-gray-600 mb-3">Projeto Alpha</p>
              <div className="flex justify-between items-center text-xs text-gray-500 mb-3">
                <span>Progresso: {i * 15}%</span>
                <span>{i} dias restantes</span>
              </div>
              <Button icon={<Tag size={18} strokeWidth={1.75} />} variant="normal" fill={false} className="w-full">
                Iniciar rotulação
              </Button>
            </div>
          </GridItemCard>
        ))}
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: `
Exemplo **completo** com todos os recursos:

- Cabeçalho da página com título, descrição e tooltip
- Campo de busca com debounce automático
- Botão de ação configurável
- Grid responsiva com cards de conteúdo
- Conteúdo customizado nos cards (incluindo mensagens auxiliares)

Este é o layout padrão utilizado nas páginas de listagem do sistema.
        `,
      },
    },
  },
};
