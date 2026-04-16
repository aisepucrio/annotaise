import type { Meta, StoryObj } from '@storybook/nextjs';
import AuthLayout from '@/components/auth-layout/AuthLayout';

const meta = {
  title: 'AuthLayout',
  component: AuthLayout,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof AuthLayout>;

export default meta;

/* =======================
   EXEMPLO: LOGIN
======================= */

export const Login: StoryObj<typeof AuthLayout> = {
  args: {
    title: 'Entrar',
    subtitle: 'Acesse sua conta para continuar',
    children: (
      <div className="mt-8">
        <form className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-700">E-mail</span>
            <input
              type="email"
              placeholder="seuemail@exemplo.com"
              className="h-11 rounded-lg border border-gray-200 px-3 outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-700">Senha</span>
            <input
              type="password"
              placeholder="Digite sua senha"
              className="h-11 rounded-lg border border-gray-200 px-3 outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>

          <button type="button" className="mt-2 h-11 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700">
            Entrar
          </button>

          <div className="text-center text-sm text-gray-600">
            <a className="underline cursor-pointer">Esqueci minha senha</a>
          </div>
        </form>
      </div>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: `
Layout base para páginas de autenticação.

- Exibe logo no topo e um card central responsivo
- Renderiza \`title\` e \`subtitle\` no cabeçalho
- O conteúdo principal é inserido via \`children\` (ex.: formulários)
        `,
      },
    },
  },
};

/* =======================
   EXEMPLO: CADASTRO
======================= */

export const Cadastro: StoryObj<typeof AuthLayout> = {
  args: {
    title: 'Criar conta',
    subtitle: 'Preencha os dados para se cadastrar',
    children: (
      <div className="mt-8">
        <form className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-700">Nome</span>
            <input
              type="text"
              placeholder="Seu nome"
              className="h-11 rounded-lg border border-gray-200 px-3 outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-700">E-mail</span>
            <input
              type="email"
              placeholder="seuemail@exemplo.com"
              className="h-11 rounded-lg border border-gray-200 px-3 outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-700">Senha</span>
            <input
              type="password"
              placeholder="Crie uma senha"
              className="h-11 rounded-lg border border-gray-200 px-3 outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>

          <button type="button" className="mt-2 h-11 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700">
            Cadastrar
          </button>

          <div className="text-center text-sm text-gray-600">
            Já tem conta? <a className="underline cursor-pointer">Entrar</a>
          </div>
        </form>
      </div>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: `
Exemplo usando o AuthLayout para fluxo de cadastro.

Ideal para manter consistência visual entre login, registro e recuperação de senha.
        `,
      },
    },
  },
};

/* =======================
   SEM SUBTÍTULO
======================= */

export const SemSubtitulo: StoryObj<typeof AuthLayout> = {
  args: {
    title: 'Recuperar acesso',
    subtitle: undefined,
    children: (
      <div className="mt-8">
        <p className="text-sm text-gray-600 mb-4">Informe seu e-mail para receber instruções.</p>

        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-700">E-mail</span>
            <input
              type="email"
              placeholder="seuemail@exemplo.com"
              className="h-11 rounded-lg border border-gray-200 px-3 outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>

          <button type="button" className="h-11 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700">
            Enviar
          </button>
        </div>
      </div>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: `
Subtítulo é opcional (\`subtitle\` pode ser \`undefined\`).

Neste caso, o espaço do subtítulo ainda existe no layout, mas o texto não é exibido.
        `,
      },
    },
  },
};

/* =======================
   SUBTÍTULO LONGO
======================= */

export const SubtituloLongo: StoryObj<typeof AuthLayout> = {
  args: {
    title: 'Bem-vinda de volta',
    subtitle:
      'Use suas credenciais para continuar. Se você estiver com problemas para acessar, verifique seu e-mail e tente redefinir a senha.',
    children: (
      <div className="mt-8">
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-700">E-mail</span>
            <input
              type="email"
              placeholder="seuemail@exemplo.com"
              className="h-11 rounded-lg border border-gray-200 px-3 outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-700">Senha</span>
            <input
              type="password"
              placeholder="Digite sua senha"
              className="h-11 rounded-lg border border-gray-200 px-3 outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>

          <button type="button" className="mt-2 h-11 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700">
            Continuar
          </button>
        </div>
      </div>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: `
Exemplo para validar comportamento com subtítulos maiores.

Útil quando a página precisa contextualizar regras de acesso ou instruções.
        `,
      },
    },
  },
};

/* =======================
   COM AVISO NO CONTEÚDO
======================= */

export const ComAviso: StoryObj<typeof AuthLayout> = {
  args: {
    title: 'Entrar',
    subtitle: 'Acesse sua conta para continuar',
    children: (
      <div className="mt-8">
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          E-mail ou senha inválidos. Tente novamente.
        </div>

        <form className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-700">E-mail</span>
            <input
              type="email"
              placeholder="seuemail@exemplo.com"
              className="h-11 rounded-lg border border-gray-200 px-3 outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-700">Senha</span>
            <input
              type="password"
              placeholder="Digite sua senha"
              className="h-11 rounded-lg border border-gray-200 px-3 outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>

          <button type="button" className="mt-2 h-11 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700">
            Entrar
          </button>
        </form>
      </div>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: `
O AuthLayout não define estados (erro, loading, etc).  
Esses estados entram no \`children\`, mantendo o layout simples e reutilizável.
        `,
      },
    },
  },
};
