import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import DatePicker from '@/components/form/DatePicker';

const meta = {
  component: DatePicker,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof DatePicker>;

export default meta;

/* =======================
   PLAYGROUND
======================= */

export const Playground: StoryObj<typeof DatePicker> = {
  args: {
    label: 'Data',
    placeholder: 'dd/mm/aaaa',
  },
  parameters: {
    docs: {
      description: {
        story: 'DatePicker base editável. Use os controles para testar diferentes propriedades.',
      },
    },
  },
};

/* =======================
   PRACTICAL EXAMPLES
======================= */

export const Examples: StoryObj<typeof DatePicker> = {
  render: () => (
    <div className="flex flex-col gap-6 w-96">
      <DatePicker label="Data inicial" placeholder="dd/mm/aaaa" />

      <DatePicker label="Data final" placeholder="dd/mm/aaaa" />

      <DatePicker label="Data de nascimento" placeholder="dd/mm/aaaa" />

      <DatePicker label="Data de entrega" placeholder="dd/mm/aaaa" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Exemplos práticos de seleção de datas em diferentes contextos.',
      },
    },
  },
};

/* =======================
   WITH ERROR
======================= */

export const WithError: StoryObj<typeof DatePicker> = {
  render: () => (
    <div className="flex flex-col gap-6 w-96">
      <DatePicker label="Data inicial" placeholder="dd/mm/aaaa" error="A data inicial é obrigatória" required />

      <DatePicker label="Data de nascimento" placeholder="dd/mm/aaaa" error="Data inválida. Você deve ter pelo menos 18 anos" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'DatePickers com mensagens de erro. A borda fica vermelha quando há erro.',
      },
    },
  },
};

/* =======================
   REQUIRED
======================= */

export const Required: StoryObj<typeof DatePicker> = {
  render: () => (
    <div className="flex flex-col gap-6 w-96">
      <DatePicker label="Data inicial" placeholder="dd/mm/aaaa" required />

      <DatePicker label="Data final" placeholder="dd/mm/aaaa" required />
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

export const WithTooltip: StoryObj<typeof DatePicker> = {
  render: () => (
    <div className="flex flex-col gap-6 w-96">
      <DatePicker label="Data inicial" placeholder="dd/mm/aaaa" tooltip="Data em que o projeto de rotulação será iniciado" />

      <DatePicker label="Data final" placeholder="dd/mm/aaaa" required tooltip="Data limite para conclusão da rotulação" />

      <DatePicker
        label="Data de nascimento"
        placeholder="dd/mm/aaaa"
        tooltip="Você deve ter pelo menos 18 anos para criar uma conta"
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'DatePickers com tooltip informativo. O ícone de informação aparece ao lado do label e mostra informações adicionais ao passar o mouse.',
      },
    },
  },
};

/* =======================
   DISABLED
======================= */

export const Disabled: StoryObj<typeof DatePicker> = {
  render: () => (
    <div className="flex flex-col gap-6 w-96">
      <DatePicker label="Data inicial (bloqueada)" placeholder="dd/mm/aaaa" disabled value="2024-01-15" />

      <DatePicker label="Data final (bloqueada)" placeholder="dd/mm/aaaa" disabled />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'DatePickers desabilitados com estilo visual diferenciado.',
      },
    },
  },
};

/* =======================
   WITHOUT LABEL
======================= */

export const WithoutLabel: StoryObj<typeof DatePicker> = {
  render: () => (
    <div className="flex flex-col gap-6 w-96">
      <DatePicker placeholder="Selecione a data..." />

      <DatePicker placeholder="dd/mm/aaaa" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'DatePickers sem label, úteis para filtros compactos.',
      },
    },
  },
};

/* =======================
   WITH PREDEFINED VALUES
======================= */

export const WithValues: StoryObj<typeof DatePicker> = {
  render: () => (
    <div className="flex flex-col gap-6 w-96">
      <DatePicker label="Data de início" placeholder="dd/mm/aaaa" value="2024-01-01" />

      <DatePicker label="Data atual" placeholder="dd/mm/aaaa" value={new Date().toISOString().split('T')[0]} />

      <DatePicker label="Data futura" placeholder="dd/mm/aaaa" value="2024-12-31" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'DatePickers com valores pré-definidos.',
      },
    },
  },
};

/* =======================
   WITH RESTRICTIONS
======================= */

export const WithConstraints: StoryObj<typeof DatePicker> = {
  render: () => {
    const today = new Date().toISOString().split('T')[0];
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() - 18);
    const maxDateStr = maxDate.toISOString().split('T')[0];

    return (
      <div className="flex flex-col gap-6 w-96">
        <DatePicker label="Data futura (mínimo hoje)" placeholder="dd/mm/aaaa" min={today} />

        <DatePicker label="Data de nascimento (máximo há 18 anos)" placeholder="dd/mm/aaaa" max={maxDateStr} />

        <DatePicker label="Data em janeiro de 2024" placeholder="dd/mm/aaaa" min="2024-01-01" max="2024-01-31" />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'DatePickers com restrições de data mínima e máxima.',
      },
    },
  },
};
