import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Mail, Lock, User, Search, EyeIcon, EyeOff } from 'lucide-react';
import { useState } from 'react';
import Input from '@/components/form/Input';

const meta = {
  component: Input,
  tags: ['autodocs'],
  args: {
    placeholder: 'Digite algo...',
  },
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Input>;

export default meta;

/* =======================
   PLAYGROUND
======================= */

export const Playground: StoryObj<typeof Input> = {
  args: {
    label: 'Campo de texto',
    placeholder: 'Digite algo...',
  },
  parameters: {
    docs: {
      description: {
        story: 'Input base editável. Use os controles para testar diferentes propriedades.',
      },
    },
  },
};

/* =======================
   VARIANTS
======================= */

export const Variants: StoryObj<typeof Input> = {
  render: () => (
    <div className="flex flex-col gap-6 w-96">
      <Input label="Email" type="email" placeholder="Digite seu email..." icon={<Mail className="w-6 h-6" />} />

      <Input label="Nome" type="text" placeholder="Digite seu nome..." icon={<User className="w-6 h-6" />} />

      <Input label="Buscar" type="text" placeholder="Buscar..." leftIcon={<Search className="w-6 h-6" />} />

      <Input label="Senha" type="password" placeholder="Digite sua senha..." icon={<Lock className="w-6 h-6" />} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Diferentes tipos de input com ícones posicionados à direita ou esquerda.',
      },
    },
  },
};

/* =======================
   WITH ERROR
======================= */

export const WithError: StoryObj<typeof Input> = {
  render: () => (
    <div className="flex flex-col gap-6 w-96">
      <Input
        label="Email"
        type="email"
        placeholder="Digite seu email..."
        value="email-invalido"
        error="Email inválido. Use o formato: exemplo@dominio.com"
        icon={<Mail className="w-6 h-6" />}
      />

      <Input
        label="Senha"
        type="password"
        placeholder="Digite sua senha..."
        required
        error="A senha deve ter no mínimo 8 caracteres"
        icon={<Lock className="w-6 h-6" />}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Inputs com mensagens de erro. A borda fica vermelha quando há erro.',
      },
    },
  },
};

/* =======================
   REQUIRED
======================= */

export const Required: StoryObj<typeof Input> = {
  render: () => (
    <div className="flex flex-col gap-6 w-96">
      <Input label="Nome completo" type="text" placeholder="Digite seu nome..." required icon={<User className="w-6 h-6" />} />

      <Input label="Email" type="email" placeholder="Digite seu email..." required icon={<Mail className="w-6 h-6" />} />
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

export const WithTooltip: StoryObj<typeof Input> = {
  render: () => (
    <div className="flex flex-col gap-6 w-96">
      <Input
        label="Email"
        type="email"
        placeholder="seu@email.com"
        tooltip="Digite um endereço de email válido"
        icon={<Mail className="w-6 h-6" />}
      />

      <Input
        label="Usuários por item"
        type="number"
        placeholder="Digite a quantidade..."
        tooltip="Quantidade de usuários que irão rotular cada item"
      />

      <Input
        label="Nome de usuário"
        placeholder="Digite seu username..."
        required
        tooltip="O nome de usuário deve ter entre 3 e 20 caracteres"
        icon={<User className="w-6 h-6" />}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Inputs com tooltip informativo. O ícone de informação aparece ao lado do label e mostra informações adicionais ao passar o mouse.',
      },
    },
  },
};

/* =======================
   DISABLED
======================= */

export const Disabled: StoryObj<typeof Input> = {
  render: () => (
    <div className="flex flex-col gap-6 w-96">
      <Input
        label="Campo desabilitado"
        type="text"
        placeholder="Não editável"
        value="Valor fixo"
        disabled
        icon={<Lock className="w-6 h-6" />}
      />

      <Input label="Email desabilitado" type="email" placeholder="email@exemplo.com" disabled icon={<Mail className="w-6 h-6" />} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Inputs desabilitados com estilo visual diferenciado.',
      },
    },
  },
};

/* =======================
   WITHOUT LABEL
======================= */

export const WithoutLabel: StoryObj<typeof Input> = {
  render: () => (
    <div className="flex flex-col gap-6 w-96">
      <Input type="text" placeholder="Buscar..." leftIcon={<Search className="w-6 h-6" />} />

      <Input type="email" placeholder="Email..." icon={<Mail className="w-6 h-6" />} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Inputs sem label, úteis para campos de busca ou formulários compactos.',
      },
    },
  },
};

/* =======================
   PASSWORD WITH TOGGLE
======================= */

export const PasswordWithToggle: StoryObj<typeof Input> = {
  render: () => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className="w-96">
        <Input
          label="Senha"
          type={showPassword ? 'text' : 'password'}
          placeholder="Digite sua senha..."
          required
          icon={showPassword ? <EyeOff className="w-6 h-6" /> : <EyeIcon className="w-6 h-6" />}
          onIconClick={() => setShowPassword(!showPassword)}
        />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Exemplo de input de senha com ícone clicável para mostrar/esconder o texto.',
      },
    },
  },
};

/* =======================
   MULTILINE (TEXTAREA)
======================= */

export const Multiline: StoryObj<typeof Input> = {
  render: () => (
    <div className="flex flex-col gap-6 w-96">
      <Input label="Descrição" placeholder="Digite uma descrição detalhada..." multiline rows={4} />

      <Input label="Comentário" placeholder="Deixe seu comentário..." multiline rows={3} required />

      <Input label="Descrição com erro" placeholder="Digite..." multiline rows={4} error="Campo obrigatório" required />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Input em modo textarea usando `multiline={true}`. Por padrão, o redimensionamento está desabilitado.',
      },
    },
  },
};

/* =======================
   RESIZABLE MULTILINE
======================= */

export const MultilineResizable: StoryObj<typeof Input> = {
  render: () => (
    <div className="flex flex-col gap-6 w-96">
      <Input
        label="Descrição redimensionável"
        placeholder="Você pode ajustar o tamanho verticalmente..."
        multiline
        rows={4}
        resizable
      />

      <Input label="Comentário redimensionável" placeholder="Ajuste conforme necessário..." multiline rows={3} resizable required />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Textarea com `resizable={true}`, permitindo ao usuário ajustar a altura manualmente.',
      },
    },
  },
};

/* =======================
   MULTILINE WITH CUSTOM HEIGHT
======================= */

export const MultilineCustomHeight: StoryObj<typeof Input> = {
  render: () => (
    <div className="flex flex-col gap-6 w-96">
      <Input label="Descrição curta (2 linhas)" placeholder="Descrição breve..." multiline rows={2} />

      <Input label="Descrição média (4 linhas)" placeholder="Descrição padrão..." multiline rows={4} />

      <Input label="Descrição longa (8 linhas)" placeholder="Descrição detalhada..." multiline rows={8} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Exemplos de textarea com diferentes alturas usando a prop `rows`.',
      },
    },
  },
};
