import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Save, Trash2, Plus } from 'lucide-react';
import Button from '@/components/button/Button';

const meta = {
  title: 'Button',
  component: Button,
  tags: ['autodocs'],
  args: {
    children: 'Botão',
    variant: 'normal',
    fill: true,
    size: 'normal',
  },
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Button>;

export default meta;

/* =======================
   PLAYGROUND (BOTÃO BASE)
======================= */

export const Playground: StoryObj<typeof Button> = {
  parameters: {
    docs: {
      description: {
        story: `
Botão base editável.

Use os controles para testar **variant**, **size**, **fill**, **bold** e **icon**.
Este exemplo não impõe nenhuma largura.
        `,
      },
    },
  },
};

/* =======================
   VARIANTES DE COR
======================= */

export const Variants: StoryObj<typeof Button> = {
  render: () => (
    <div className="flex flex-col items-center gap-3 w-64">
      <Button>Ação primária</Button>
      <Button variant="light">Ação secundária</Button>
      <Button variant="green">Confirmar</Button>
      <Button variant="red">Excluir</Button>
      <Button variant="white">Branco</Button>
      <Button variant="disabled">Desabilitado</Button>
    </div>
  ),
};

/* =======================
   COMPORTAMENTO DO FILL
======================= */

export const FillBehavior: StoryObj<typeof Button> = {
  render: () => (
    <div className="flex flex-col items-center gap-4">
      <div className="w-64 border border-dashed border-metal-400 p-2">
        <Button fill>Fill = true </Button>
      </div>

      <div className="w-64 border border-dashed border-metal-400 p-2 flex justify-center">
        <Button fill={false}>Fill = false </Button>
      </div>
    </div>
  ),
};

/* =======================
   TAMANHOS (SIZE)
======================= */

export const Sizes: StoryObj<typeof Button> = {
  render: () => (
    <div className="flex flex-col items-center gap-4 w-64">
      {/* Botão com texto */}
      <Button size="normal" fill={false}>
        tx
      </Button>

      {/* Botão apenas com ícone */}
      <Button size="icon" ariaLabel="Adicionar" fill={false}>
        {' '}
        <Plus size={16} />{' '}
      </Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: `
### Propriedade \`size\`

- **normal**: Padding padrão para botões com texto
- **icon**: Padding para botões de ícone (fill = false recomendado)

        `,
      },
    },
  },
};

/* =======================
   PESO DA FONTE
======================= */

export const FontWeight: StoryObj<typeof Button> = {
  render: () => (
    <div className="flex flex-col items-center gap-3 w-64">
      <Button>Texto normal</Button>
      <Button bold>Texto em destaque</Button>
    </div>
  ),
};

/* =======================
   BOTÕES COM ÍCONE
======================= */

export const WithIcon: StoryObj<typeof Button> = {
  render: () => (
    <div className="flex flex-col items-center gap-3 w-64">
      <Button icon={<Save size={16} />}>Salvar</Button>
      <Button variant="red" icon={<Trash2 size={16} />}>
        Excluir
      </Button>
    </div>
  ),
};
