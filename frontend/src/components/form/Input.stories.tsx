import type { Meta, StoryObj } from "@storybook/react";
import { Mail, Lock, User, Search, EyeIcon, EyeOff } from "lucide-react";
import { useState } from "react";
import Input from "./Input";

const meta = {
  component: Input,
  tags: ["autodocs"],
  args: {
    placeholder: "Digite algo...",
  },
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Input>;

export default meta;

/* =======================
   PLAYGROUND
======================= */

export const Playground: StoryObj<typeof Input> = {
  args: {
    label: "Campo de texto",
    placeholder: "Digite algo...",
  },
  parameters: {
    docs: {
      description: {
        story:
          "Input base editável. Use os controles para testar diferentes propriedades.",
      },
    },
  },
};

/* =======================
   VARIANTES
======================= */

export const Variants: StoryObj<typeof Input> = {
  render: () => (
    <div className="flex flex-col gap-6 w-96">
      <Input
        label="Email"
        type="email"
        placeholder="Digite seu email..."
        icon={<Mail className="w-6 h-6" />}
      />

      <Input
        label="Nome"
        type="text"
        placeholder="Digite seu nome..."
        icon={<User className="w-6 h-6" />}
      />

      <Input
        label="Buscar"
        type="text"
        placeholder="Buscar..."
        leftIcon={<Search className="w-6 h-6" />}
      />

      <Input
        label="Senha"
        type="password"
        placeholder="Digite sua senha..."
        icon={<Lock className="w-6 h-6" />}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Diferentes tipos de input com ícones posicionados à direita ou esquerda.",
      },
    },
  },
};

/* =======================
   COM ERRO
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
        story:
          "Inputs com mensagens de erro. A borda fica vermelha quando há erro.",
      },
    },
  },
};

/* =======================
   OBRIGATÓRIO
======================= */

export const Required: StoryObj<typeof Input> = {
  render: () => (
    <div className="flex flex-col gap-6 w-96">
      <Input
        label="Nome completo"
        type="text"
        placeholder="Digite seu nome..."
        required
        icon={<User className="w-6 h-6" />}
      />

      <Input
        label="Email"
        type="email"
        placeholder="Digite seu email..."
        required
        icon={<Mail className="w-6 h-6" />}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Campos obrigatórios com asterisco vermelho no label.",
      },
    },
  },
};

/* =======================
   DESABILITADO
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

      <Input
        label="Email desabilitado"
        type="email"
        placeholder="email@exemplo.com"
        disabled
        icon={<Mail className="w-6 h-6" />}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Inputs desabilitados com estilo visual diferenciado.",
      },
    },
  },
};

/* =======================
   SEM LABEL
======================= */

export const WithoutLabel: StoryObj<typeof Input> = {
  render: () => (
    <div className="flex flex-col gap-6 w-96">
      <Input
        type="text"
        placeholder="Buscar..."
        leftIcon={<Search className="w-6 h-6" />}
      />

      <Input
        type="email"
        placeholder="Email..."
        icon={<Mail className="w-6 h-6" />}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Inputs sem label, úteis para campos de busca ou formulários compactos.",
      },
    },
  },
};

/* =======================
   PASSWORD COM TOGGLE
======================= */

export const PasswordWithToggle: StoryObj<typeof Input> = {
  render: () => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className="w-96">
        <div className="relative">
          <Input
            label="Senha"
            type={showPassword ? "text" : "password"}
            placeholder="Digite sua senha..."
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded focus:outline-none text-metal-200 hover:text-metal-500 transition-colors"
          >
            {showPassword ? (
              <EyeOff className="w-6 h-6" />
            ) : (
              <EyeIcon className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          "Exemplo de input de senha com botão para mostrar/esconder o texto.",
      },
    },
  },
};
