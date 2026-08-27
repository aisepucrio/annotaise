import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Building2, MapPin, Globe } from 'lucide-react';
import Select from '@/components/form/Select';

const meta = {
  component: Select,
  tags: ['autodocs'],
  args: {
    options: [
      { value: '1', label: 'Opção 1' },
      { value: '2', label: 'Opção 2' },
      { value: '3', label: 'Opção 3' },
    ],
    placeholder: 'Selecionar...',
  },
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Select>;

export default meta;

/* =======================
   PLAYGROUND
======================= */

export const Playground: StoryObj<typeof Select> = {
  args: {
    label: 'Selecione',
    options: [
      { value: 'opcao1', label: 'Opção 1' },
      { value: 'opcao2', label: 'Opção 2' },
      { value: 'opcao3', label: 'Opção 3' },
      { value: 'opcao4', label: 'Opção 4' },
    ],
    placeholder: 'Selecionar...',
  },
  parameters: {
    docs: {
      description: {
        story: 'Select base editável. Use os controles para testar diferentes propriedades.',
      },
    },
  },
};

/* =======================
   PRACTICAL EXAMPLES
======================= */

export const Examples: StoryObj<typeof Select> = {
  render: () => (
    <div className="flex flex-col gap-6 w-96">
      <Select
        label="Projeto"
        placeholder="Selecionar projeto relacionado..."
        options={[
          { value: 'proj1', label: 'Projeto Alpha' },
          { value: 'proj2', label: 'Projeto Beta' },
          { value: 'proj3', label: 'Projeto Gamma' },
          { value: 'proj4', label: 'Projeto Delta' },
        ]}
        icon={<Building2 className="w-6 h-6" />}
      />

      <Select
        label="Estado"
        placeholder="Selecione seu estado..."
        options={[
          { value: 'sp', label: 'São Paulo' },
          { value: 'rj', label: 'Rio de Janeiro' },
          { value: 'mg', label: 'Minas Gerais' },
          { value: 'ba', label: 'Bahia' },
          { value: 'pr', label: 'Paraná' },
        ]}
        icon={<MapPin className="w-6 h-6" />}
      />

      <Select
        label="Idioma"
        placeholder="Selecione o idioma..."
        options={[
          { value: 'pt', label: 'Português' },
          { value: 'en', label: 'English' },
          { value: 'es', label: 'Español' },
          { value: 'fr', label: 'Français' },
        ]}
        icon={<Globe className="w-6 h-6" />}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Exemplos práticos de select com diferentes contextos e ícones.',
      },
    },
  },
};

/* =======================
   WITH ERROR
======================= */

export const WithError: StoryObj<typeof Select> = {
  render: () => (
    <div className="flex flex-col gap-6 w-96">
      <Select
        label="Projeto"
        placeholder="Selecionar projeto relacionado..."
        error="Você deve selecionar um projeto"
        required
        options={[
          { value: 'proj1', label: 'Projeto Alpha' },
          { value: 'proj2', label: 'Projeto Beta' },
          { value: 'proj3', label: 'Projeto Gamma' },
        ]}
      />

      <Select
        label="Categoria"
        placeholder="Selecione a categoria..."
        error="Campo obrigatório"
        options={[
          { value: 'cat1', label: 'Categoria A' },
          { value: 'cat2', label: 'Categoria B' },
          { value: 'cat3', label: 'Categoria C' },
        ]}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Selects com mensagens de erro. A borda fica vermelha quando há erro.',
      },
    },
  },
};

/* =======================
   REQUIRED
======================= */

export const Required: StoryObj<typeof Select> = {
  render: () => (
    <div className="flex flex-col gap-6 w-96">
      <Select
        label="Projeto"
        placeholder="Selecionar projeto relacionado..."
        required
        options={[
          { value: 'proj1', label: 'Projeto Alpha' },
          { value: 'proj2', label: 'Projeto Beta' },
          { value: 'proj3', label: 'Projeto Gamma' },
        ]}
      />

      <Select
        label="Tipo de rotulação"
        placeholder="Selecione o tipo..."
        required
        options={[
          { value: 'class', label: 'Classificação' },
          { value: 'ner', label: 'NER (Named Entity Recognition)' },
          { value: 'sentiment', label: 'Análise de Sentimento' },
        ]}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Campos obrigatórios com asterisco vermelho no label.',
      },
    },
  },
};

/* =======================
   WITH TOOLTIP
======================= */

export const WithTooltip: StoryObj<typeof Select> = {
  render: () => (
    <div className="flex flex-col gap-6 w-96">
      <Select
        label="Projeto"
        placeholder="Selecionar projeto relacionado..."
        tooltip="Escolha o projeto ao qual esta rotulação será vinculada"
        options={[
          { value: 'proj1', label: 'Projeto Alpha' },
          { value: 'proj2', label: 'Projeto Beta' },
          { value: 'proj3', label: 'Projeto Gamma' },
        ]}
        icon={<Building2 className="w-6 h-6" />}
      />

      <Select
        label="Tipo de rotulação"
        placeholder="Selecione o tipo..."
        required
        tooltip="Define o método de rotulação que será utilizado neste projeto"
        options={[
          { value: 'class', label: 'Classificação' },
          { value: 'ner', label: 'NER (Named Entity Recognition)' },
          { value: 'sentiment', label: 'Análise de Sentimento' },
        ]}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Selects com tooltip informativo. O ícone de informação aparece ao lado do label e mostra informações adicionais ao passar o mouse.',
      },
    },
  },
};

/* =======================
   DISABLED
======================= */

export const Disabled: StoryObj<typeof Select> = {
  render: () => (
    <div className="flex flex-col gap-6 w-96">
      <Select
        label="Projeto (bloqueado)"
        placeholder="Selecionar projeto..."
        disabled
        options={[
          { value: 'proj1', label: 'Projeto Alpha' },
          { value: 'proj2', label: 'Projeto Beta' },
        ]}
      />

      <Select
        label="Status (bloqueado)"
        placeholder="Selecione o status..."
        disabled
        value="active"
        options={[
          { value: 'active', label: 'Ativo' },
          { value: 'inactive', label: 'Inativo' },
          { value: 'pending', label: 'Pendente' },
        ]}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Selects desabilitados com estilo visual diferenciado.',
      },
    },
  },
};

/* =======================
   WITHOUT LABEL
======================= */

export const WithoutLabel: StoryObj<typeof Select> = {
  render: () => (
    <div className="flex flex-col gap-6 w-96">
      <Select
        placeholder="Filtrar por categoria..."
        options={[
          { value: 'all', label: 'Todas as categorias' },
          { value: 'cat1', label: 'Categoria A' },
          { value: 'cat2', label: 'Categoria B' },
          { value: 'cat3', label: 'Categoria C' },
        ]}
      />

      <Select
        placeholder="Ordenar por..."
        options={[
          { value: 'name', label: 'Nome' },
          { value: 'date', label: 'Data' },
          { value: 'status', label: 'Status' },
        ]}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Selects sem label, úteis para filtros e ordenação.',
      },
    },
  },
};

/* =======================
   WITH MANY OPTIONS
======================= */

export const WithManyOptions: StoryObj<typeof Select> = {
  render: () => (
    <div className="w-96">
      <Select
        label="País"
        placeholder="Selecione o país..."
        options={[
          { value: 'br', label: 'Brasil' },
          { value: 'ar', label: 'Argentina' },
          { value: 'bo', label: 'Bolívia' },
          { value: 'cl', label: 'Chile' },
          { value: 'co', label: 'Colômbia' },
          { value: 'ec', label: 'Equador' },
          { value: 'gy', label: 'Guiana' },
          { value: 'py', label: 'Paraguai' },
          { value: 'pe', label: 'Peru' },
          { value: 'sr', label: 'Suriname' },
          { value: 'uy', label: 'Uruguai' },
          { value: 've', label: 'Venezuela' },
        ]}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Select com muitas opções. O browser adiciona scroll automaticamente.',
      },
    },
  },
};
