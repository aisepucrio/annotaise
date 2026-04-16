import type { Meta, StoryObj } from '@storybook/nextjs';
import { useState } from 'react';
import FilterBar from '@/components/FilterBar';

const meta = {
  title: 'FilterBar',
  component: FilterBar,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof FilterBar>;

export default meta;

/* =======================
   PLAYGROUND
======================= */

export const Playground: StoryObj<typeof FilterBar> = {
  render: (args) => {
    const [value, setValue] = useState('');
    return <FilterBar {...args} value={value} onChange={setValue} />;
  },
  args: {
    placeholder: 'Buscar itens...',
    filterButtonText: 'Filtrar',
    showFilterButton: true,
    disabled: false,
  },
  parameters: {
    docs: {
      description: {
        story: `
Barra de busca editável com botão de filtro.

Use os controles para testar **placeholder**, **filterButtonText**, **showFilterButton** e **disabled**.
        `,
      },
    },
  },
};

/* =======================
   EXEMPLO BÁSICO
======================= */

export const Basic: StoryObj<typeof FilterBar> = {
  render: () => {
    const [value, setValue] = useState('');
    return <FilterBar value={value} onChange={setValue} placeholder="Buscar projetos..." />;
  },
  parameters: {
    docs: {
      description: {
        story: `
Exemplo básico com placeholder customizado.

A busca funciona com **estado controlado** (controlled component).
        `,
      },
    },
  },
};

/* =======================
   SEM BOTÃO DE FILTRO
======================= */

export const WithoutFilterButton: StoryObj<typeof FilterBar> = {
  render: () => {
    const [value, setValue] = useState('');
    return <FilterBar value={value} onChange={setValue} placeholder="Buscar usuários..." showFilterButton={false} />;
  },
  parameters: {
    docs: {
      description: {
        story: `
Apenas o campo de busca, **sem botão de filtro**.

Use \`showFilterButton={false}\` para ocultar o botão.
        `,
      },
    },
  },
};

/* =======================
   DESABILITADO
======================= */

export const Disabled: StoryObj<typeof FilterBar> = {
  render: () => {
    const [value, setValue] = useState('');
    return <FilterBar value={value} onChange={setValue} placeholder="A busca está desabilitada" disabled />;
  },
  parameters: {
    docs: {
      description: {
        story: `
Estado **desabilitado**.

O campo fica visualmente diferente e não aceita input.
        `,
      },
    },
  },
};

/* =======================
   COM VALOR PRÉ-PREENCHIDO
======================= */

export const WithValue: StoryObj<typeof FilterBar> = {
  render: () => {
    const [value, setValue] = useState('Componentes React');
    return <FilterBar value={value} onChange={setValue} placeholder="Buscar projetos..." />;
  },
  parameters: {
    docs: {
      description: {
        story: `
Campo com **valor inicial**.

Útil para manter termos de busca entre navegações.
        `,
      },
    },
  },
};

/* =======================
   CUSTOMIZADO
======================= */

export const Customized: StoryObj<typeof FilterBar> = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <FilterBar
        value={value}
        onChange={setValue}
        placeholder="Digite para buscar rotulagens..."
        filterButtonText="Filtros avançados"
        onFilterClick={() => alert('Filtro clicado!')}
      />
    );
  },
  parameters: {
    docs: {
      description: {
        story: `
Exemplo com **texto customizado** no botão e **callback** de clique.

Use \`filterButtonText\` para mudar o texto e \`onFilterClick\` para adicionar ação.
        `,
      },
    },
  },
};

/* =======================
   MÚLTIPLAS BARRAS
======================= */

export const MultipleBars: StoryObj<typeof FilterBar> = {
  render: () => {
    const [search1, setSearch1] = useState('');
    const [search2, setSearch2] = useState('');
    const [search3, setSearch3] = useState('');

    return (
      <div className="space-y-4">
        <FilterBar value={search1} onChange={setSearch1} placeholder="Buscar projetos..." filterButtonText="Filtros" />
        <FilterBar value={search2} onChange={setSearch2} placeholder="Buscar usuários..." showFilterButton={false} />
        <FilterBar value={search3} onChange={setSearch3} placeholder="Buscar rotulagens..." filterButtonText="Avançado" />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: `
Exemplo com **múltiplas barras** de busca independentes.

Cada uma mantém seu próprio estado e configuração.
        `,
      },
    },
  },
};
