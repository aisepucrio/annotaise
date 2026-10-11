import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import PasswordInput from '@/components/form/PasswordInput';

const meta = {
  component: PasswordInput,
  tags: ['autodocs'],
  args: {
    placeholder: 'Digite sua senha...',
  },
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof PasswordInput>;

export default meta;

/* =======================
   PLAYGROUND
======================= */

export const Playground: StoryObj<typeof PasswordInput> = {
  args: {
    label: 'Senha',
    placeholder: 'Digite sua senha...',
  },
  parameters: {
    docs: {
      description: {
        story: 'Campo de senha com botão embutido para alternar a visibilidade do valor.',
      },
    },
  },
};

/* =======================
   VARIANTS
======================= */

export const Variants: StoryObj<typeof PasswordInput> = {
  render: () => (
    <div className="flex w-96 flex-col gap-6">
      <PasswordInput label="Senha" placeholder="Digite sua senha..." />

      <PasswordInput label="Nova senha" placeholder="Crie uma senha forte" required />

      <PasswordInput label="Confirmar senha" placeholder="Repita a senha criada" tooltip="Use a mesma senha digitada no campo anterior" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Exemplos básicos do PasswordInput com variações de label, required e tooltip.',
      },
    },
  },
};

/* =======================
   WITH ERROR
======================= */

export const WithError: StoryObj<typeof PasswordInput> = {
  render: () => (
    <div className="flex w-96 flex-col gap-6">
      <PasswordInput
        label="Senha"
        placeholder="Digite sua senha..."
        value="123"
        error="A senha deve ter no mínimo 8 caracteres"
      />

      <PasswordInput
        label="Confirmar senha"
        placeholder="Repita sua senha..."
        value="1234"
        error="As senhas não coincidem"
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Campos com mensagem de erro, mantendo o toggle de visibilidade funcional.',
      },
    },
  },
};

/* =======================
   DISABLED
======================= */

export const Disabled: StoryObj<typeof PasswordInput> = {
  render: () => (
    <div className="flex w-96 flex-col gap-6">
      <PasswordInput label="Senha desabilitada" placeholder="Sem edição" disabled />

      <PasswordInput label="Senha preenchida" value="senha-fixa" disabled />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Estados desabilitados do campo de senha.',
      },
    },
  },
};
