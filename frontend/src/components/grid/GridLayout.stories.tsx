import type { Meta, StoryObj } from '@storybook/nextjs';
import GridLayout from './GridLayout';
import GridItemCard from './GridItemCard';

const meta = {
  title: 'GridLayout',
  component: GridLayout,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof GridLayout>;

export default meta;

/* =======================
   PLAYGROUND
======================= */

export const Playground: StoryObj<typeof GridLayout> = {
  args: {
    minColumnWidth: '400px',
  },
  render: (args) => (
    <GridLayout {...args}>
      {Array.from({ length: 6 }).map((_, i) => (
        <GridItemCard key={i} index={i}>
          <div className="p-4">
            <h3 className="font-bold text-lg mb-2">Item {i + 1}</h3>
            <p className="text-gray-600">Conteúdo do card {i + 1}. Este é um exemplo de item no grid.</p>
          </div>
        </GridItemCard>
      ))}
    </GridLayout>
  ),
  parameters: {
    docs: {
      description: {
        story: 'GridLayout base editável. Use os controles para testar diferentes tamanhos de coluna.',
      },
    },
  },
};

/* =======================
   EXEMPLOS PRÁTICOS
======================= */

export const Examples: StoryObj<typeof GridLayout> = {
  render: () => (
    <div className="flex flex-col gap-8">
      <div>
        <h3 className="text-xl font-bold mb-4">Grid com 6 itens</h3>
        <GridLayout>
          {Array.from({ length: 6 }).map((_, i) => (
            <GridItemCard key={i} index={i}>
              <div className="p-4">
                <h4 className="font-semibold text-lg mb-2">Projeto {i + 1}</h4>
                <p className="text-gray-600 text-sm">Descrição do projeto de rotulação</p>
                <div className="mt-3 flex gap-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">Em andamento</span>
                </div>
              </div>
            </GridItemCard>
          ))}
        </GridLayout>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Exemplo prático de grid com cards de projetos.',
      },
    },
  },
};

/* =======================
   DIFERENTES QUANTIDADES
======================= */

export const DifferentCounts: StoryObj<typeof GridLayout> = {
  render: () => (
    <div className="flex flex-col gap-8">
      <div>
        <h3 className="text-xl font-bold mb-4">1 item</h3>
        <GridLayout>
          <GridItemCard index={0}>
            <div className="p-4">
              <h4 className="font-semibold">Único item</h4>
              <p className="text-gray-600 text-sm">Quando há apenas um item, ele não se expande para preencher toda a largura</p>
            </div>
          </GridItemCard>
        </GridLayout>
      </div>

      <div>
        <h3 className="text-xl font-bold mb-4">3 itens</h3>
        <GridLayout>
          {Array.from({ length: 3 }).map((_, i) => (
            <GridItemCard key={i} index={i}>
              <div className="p-4">
                <h4 className="font-semibold">Item {i + 1}</h4>
              </div>
            </GridItemCard>
          ))}
        </GridLayout>
      </div>

      <div>
        <h3 className="text-xl font-bold mb-4">9 itens</h3>
        <GridLayout>
          {Array.from({ length: 9 }).map((_, i) => (
            <GridItemCard key={i} index={i}>
              <div className="p-4">
                <h4 className="font-semibold">Item {i + 1}</h4>
              </div>
            </GridItemCard>
          ))}
        </GridLayout>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Grid com diferentes quantidades de itens. O layout se adapta automaticamente.',
      },
    },
  },
};

/* =======================
   TAMANHOS DE COLUNA
======================= */

export const ColumnSizes: StoryObj<typeof GridLayout> = {
  render: () => (
    <div className="flex flex-col gap-8">
      <div>
        <h3 className="text-xl font-bold mb-4">Colunas pequenas (300px)</h3>
        <GridLayout minColumnWidth="300px">
          {Array.from({ length: 6 }).map((_, i) => (
            <GridItemCard key={i} index={i}>
              <div className="p-4">
                <h4 className="font-semibold">Item {i + 1}</h4>
                <p className="text-gray-600 text-sm">Coluna de 300px</p>
              </div>
            </GridItemCard>
          ))}
        </GridLayout>
      </div>

      <div>
        <h3 className="text-xl font-bold mb-4">Colunas médias (400px)</h3>
        <GridLayout minColumnWidth="400px">
          {Array.from({ length: 6 }).map((_, i) => (
            <GridItemCard key={i} index={i}>
              <div className="p-4">
                <h4 className="font-semibold">Item {i + 1}</h4>
                <p className="text-gray-600 text-sm">Coluna de 400px</p>
              </div>
            </GridItemCard>
          ))}
        </GridLayout>
      </div>

      <div>
        <h3 className="text-xl font-bold mb-4">Colunas grandes (500px)</h3>
        <GridLayout minColumnWidth="500px">
          {Array.from({ length: 6 }).map((_, i) => (
            <GridItemCard key={i} index={i}>
              <div className="p-4">
                <h4 className="font-semibold">Item {i + 1}</h4>
                <p className="text-gray-600 text-sm">Coluna de 500px</p>
              </div>
            </GridItemCard>
          ))}
        </GridLayout>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Grids com diferentes tamanhos mínimos de coluna. O grid sempre usa o espaço disponível de forma responsiva.',
      },
    },
  },
};

/* =======================
   COM CONTEÚDO VARIADO
======================= */

export const VariedContent: StoryObj<typeof GridLayout> = {
  render: () => (
    <GridLayout>
      <GridItemCard index={0}>
        <div className="p-4">
          <h4 className="font-bold text-lg mb-2">Projeto Simples</h4>
          <p className="text-gray-600 text-sm">Descrição breve</p>
        </div>
      </GridItemCard>

      <GridItemCard index={1}>
        <div className="p-4">
          <h4 className="font-bold text-lg mb-2">Projeto com Mais Detalhes</h4>
          <p className="text-gray-600 text-sm mb-3">
            Este projeto tem uma descrição mais longa para demonstrar como os cards se comportam com diferentes quantidades de
            conteúdo.
          </p>
          <div className="flex gap-2 flex-wrap">
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Ativo</span>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">Categoria A</span>
          </div>
        </div>
      </GridItemCard>

      <GridItemCard index={2}>
        <div className="p-4">
          <h4 className="font-bold text-lg mb-2">Projeto Complexo</h4>
          <p className="text-gray-600 text-sm mb-3">Um projeto com múltiplos elementos e informações mais complexas.</p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Progresso:</span>
              <span className="font-semibold">75%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '75%' }} />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">Prioritário</span>
          </div>
        </div>
      </GridItemCard>

      <GridItemCard index={3}>
        <div className="p-4">
          <h4 className="font-bold text-lg mb-2">Lista de Tarefas</h4>
          <ul className="space-y-1 text-sm text-gray-600">
            <li>✓ Tarefa concluída 1</li>
            <li>✓ Tarefa concluída 2</li>
            <li>○ Tarefa pendente 1</li>
            <li>○ Tarefa pendente 2</li>
          </ul>
        </div>
      </GridItemCard>

      <GridItemCard index={4}>
        <div className="p-4">
          <h4 className="font-bold text-lg mb-2">Informações do Usuário</h4>
          <div className="space-y-2 text-sm">
            <div className="flex gap-2">
              <span className="text-gray-500">Nome:</span>
              <span>João Silva</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-500">Email:</span>
              <span>joao@example.com</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-500">Função:</span>
              <span>Rotulador</span>
            </div>
          </div>
        </div>
      </GridItemCard>

      <GridItemCard index={5}>
        <div className="p-4">
          <h4 className="font-bold text-lg mb-2">Estatísticas</h4>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">42</div>
              <div className="text-xs text-gray-500">Completos</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">8</div>
              <div className="text-xs text-gray-500">Pendentes</div>
            </div>
          </div>
        </div>
      </GridItemCard>
    </GridLayout>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Cards com diferentes tipos de conteúdo, demonstrando a versatilidade do componente.',
      },
    },
  },
};

/* =======================
   PADRÃO DE CORES ALTERNADAS
======================= */

export const ColorPattern: StoryObj<typeof GridLayout> = {
  render: () => (
    <div className="flex flex-col gap-8">
      <div>
        <h3 className="text-xl font-bold mb-4">Padrão xadrez de cores (baseado em posição)</h3>
        <p className="text-gray-600 mb-4">
          As cores das bordas alternam em padrão xadrez. Items em posições (linha + coluna) pares têm blueberry-500, ímpares têm
          blueberry-700.
        </p>
        <GridLayout>
          {Array.from({ length: 12 }).map((_, i) => (
            <GridItemCard key={i} index={i}>
              <div className="p-4">
                <h4 className="font-semibold">Item {i + 1}</h4>
                <p className="text-gray-500 text-xs mt-1">Índice: {i}</p>
              </div>
            </GridItemCard>
          ))}
        </GridLayout>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Demonstração do padrão de cores alternadas que cria um efeito visual de xadrez.',
      },
    },
  },
};
