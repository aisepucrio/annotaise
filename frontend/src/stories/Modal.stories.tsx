import type { Meta, StoryObj } from '@storybook/nextjs';
import Modal from '@/components/Modal';

const meta: Meta<typeof Modal> = {
  title: 'Modal',
  component: Modal,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Modal genérico e reutilizável com título alinhado ao botão X, subtítulo e descrição opcionais. ' +
          'Aceita ReactNode em todos os textos para formatação personalizada. ' +
          'Conteúdo com scroll automático quando necessário. ' +
          'Fecha ao pressionar ESC ou clicar no backdrop (pode ser desabilitado).\n\n' +
          '**Para visualizar os modais, abra cada story em tela cheia clicando no ícone de expand na barra superior.**',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    open: {
      control: 'boolean',
      description: 'Controla a visibilidade do modal',
    },
    title: {
      control: 'text',
      description: 'Título principal do modal (ReactNode)',
    },
    subtitle: {
      control: 'text',
      description: 'Subtítulo opcional (ReactNode)',
    },
    description: {
      control: 'text',
      description: 'Descrição opcional (ReactNode)',
    },
    maxWidth: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl', '2xl'],
      description: 'Largura máxima do modal',
    },
    disableBackdropClick: {
      control: 'boolean',
      description: 'Se true, não fecha ao clicar no backdrop',
    },
    hideCloseButton: {
      control: 'boolean',
      description: 'Se true, esconde o botão X de fechar',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Modal>;

/**
 * Modal básico com título, subtítulo e conteúdo simples.
 *
 * Para visualizar, abra esta story em tela cheia clicando no ícone de expand na barra superior.
 */
export const Default: Story = {
  args: {
    open: true,
    title: 'Título centralizado popup',
    subtitle: 'Subtítulo opcional do popup... bla bla',
    onClose: () => {},
    children: (
      <div className="bg-gray-100 rounded-lg p-12 min-h-[12rem] flex items-center justify-center text-gray-500">
        Conteúdo redimensionável (children)
      </div>
    ),
  },
};

/**
 * Modal com título, subtítulo e descrição - todos presentes.
 *
 * Para visualizar, abra esta story em tela cheia clicando no ícone de expand na barra superior.
 */
export const WithAllTexts: Story = {
  args: {
    open: true,
    title: 'Título centralizado popup',
    subtitle: 'Subtítulo opcional do popup... bla bla',
    description: 'Descrição opcional do popup... bla bla bla bla bla bla bla bla bla bla bla',
    onClose: () => {},
    children: (
      <div className="bg-gray-100 rounded-lg p-12 min-h-[12rem] flex items-center justify-center text-gray-500">
        Conteúdo redimensionável (children)
      </div>
    ),
  },
};

/**
 * Modal apenas com título - subtítulo e descrição ausentes.
 *
 * Para visualizar, abra esta story em tela cheia clicando no ícone de expand na barra superior.
 */
export const OnlyTitle: Story = {
  args: {
    open: true,
    title: 'Apenas título',
    onClose: () => {},
    children: (
      <div className="bg-gray-100 rounded-lg p-12 min-h-[12rem] flex items-center justify-center text-gray-500">
        Conteúdo sem subtítulo ou descrição
      </div>
    ),
  },
};

/**
 * Modal com textos formatados usando ReactNode (bold, itálico).
 *
 * Para visualizar, abra esta story em tela cheia clicando no ícone de expand na barra superior.
 */
export const WithFormattedText: Story = {
  args: {
    open: true,
    title: (
      <>
        Título com <strong>negrito</strong> e <em>itálico</em>
      </>
    ),
    subtitle: (
      <>
        Subtítulo com <strong>formatação</strong> customizada
      </>
    ),
    description: (
      <>
        Descrição também pode ter <em>itálico</em> e outros elementos
      </>
    ),
    onClose: () => {},
    children: (
      <div className="space-y-3">
        <p>
          O título, subtítulo e descrição aceitam <code>ReactNode</code>, permitindo formatação rica.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">Use negrito, itálico, links e outros elementos HTML.</p>
        </div>
      </div>
    ),
  },
};

/**
 * Modal com formulário de exemplo mostrando uso prático.
 *
 * Para visualizar, abra esta story em tela cheia clicando no ícone de expand na barra superior.
 */
export const WithForm: Story = {
  args: {
    open: true,
    title: 'Editar perfil',
    subtitle: 'Atualize suas informações pessoais',
    onClose: () => {},
    children: (
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium block mb-1" style={{ color: 'var(--metal-700)' }}>
            Nome
          </label>
          <input
            type="text"
            placeholder="Seu nome"
            className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none"
            style={{ borderColor: 'var(--metal-200)' }}
          />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1" style={{ color: 'var(--metal-700)' }}>
            Email
          </label>
          <input
            type="email"
            placeholder="seu@email.com"
            className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none"
            style={{ borderColor: 'var(--metal-200)' }}
          />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            className="px-4 py-2 rounded-lg text-sm"
            style={{
              color: 'var(--blueberry-700)',
              backgroundColor: 'var(--metal-50)',
            }}
          >
            Cancelar
          </button>
          <button
            className="px-4 py-2 rounded-lg text-sm"
            style={{
              color: 'var(--metal-50)',
              backgroundColor: 'var(--blueberry-700)',
            }}
          >
            Salvar
          </button>
        </div>
      </div>
    ),
  },
};

/**
 * Modal sem botão de fechar (X), útil para fluxos obrigatórios.
 *
 * Para visualizar, abra esta story em tela cheia clicando no ícone de expand na barra superior.
 */
export const WithoutCloseButton: Story = {
  args: {
    open: true,
    title: 'Ação importante',
    subtitle: 'Esta ação requer confirmação',
    hideCloseButton: true,
    disableBackdropClick: true,
    onClose: () => {},
    children: (
      <div className="space-y-4">
        <p className="text-sm" style={{ color: 'var(--metal-700)' }}>
          Tem certeza que deseja continuar? Esta ação não pode ser desfeita.
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <button
            className="px-4 py-2 rounded-lg text-sm"
            style={{
              color: 'var(--blueberry-700)',
              backgroundColor: 'var(--metal-50)',
            }}
          >
            Cancelar
          </button>
          <button
            className="px-4 py-2 rounded-lg text-sm"
            style={{
              color: 'var(--metal-50)',
              backgroundColor: 'var(--red-blueberry)',
            }}
          >
            Confirmar
          </button>
        </div>
      </div>
    ),
  },
};

/**
 * Modal pequeno para confirmações rápidas.
 *
 * Para visualizar, abra esta story em tela cheia clicando no ícone de expand na barra superior.
 */
export const SmallModal: Story = {
  args: {
    open: true,
    title: 'Confirmar exclusão',
    maxWidth: 'sm',
    onClose: () => {},
    children: (
      <div className="space-y-4">
        <p className="text-sm text-center" style={{ color: 'var(--metal-700)' }}>
          Deseja realmente excluir este item?
        </p>
        <div className="flex justify-center gap-3">
          <button
            className="px-4 py-2 rounded-lg text-sm"
            style={{
              color: 'var(--blueberry-700)',
              backgroundColor: 'var(--metal-50)',
            }}
          >
            Cancelar
          </button>
          <button
            className="px-4 py-2 rounded-lg text-sm"
            style={{
              color: 'var(--metal-50)',
              backgroundColor: 'var(--red-blueberry)',
            }}
          >
            Excluir
          </button>
        </div>
      </div>
    ),
  },
};

/**
 * Modal grande com conteúdo extenso e scroll automático.
 *
 * Para visualizar, abra esta story em tela cheia clicando no ícone de expand na barra superior.
 */
export const LargeModalWithScroll: Story = {
  args: {
    open: true,
    title: 'Termos de uso',
    subtitle: 'Leia atentamente antes de continuar',
    maxWidth: '2xl',
    onClose: () => {},
    children: (
      <div className="space-y-4">
        <div className="space-y-3 text-sm" style={{ color: 'var(--metal-700)' }}>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
          </p>
          <p>
            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint
            occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
          </p>
          <p>
            Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque
            ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
          </p>
          <p>
            Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui
            ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci
            velit.
          </p>
          <p>
            At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti
            quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia
            deserunt mollitia animi, id est laborum et dolorum fuga.
          </p>
          <p>
            Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque
            nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est, omnis dolor repellendus.
          </p>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <button
            className="px-4 py-2 rounded-lg text-sm"
            style={{
              color: 'var(--blueberry-700)',
              backgroundColor: 'var(--metal-50)',
            }}
          >
            Recusar
          </button>
          <button
            className="px-4 py-2 rounded-lg text-sm"
            style={{
              color: 'var(--metal-50)',
              backgroundColor: 'var(--blueberry-700)',
            }}
          >
            Aceitar
          </button>
        </div>
      </div>
    ),
  },
};
