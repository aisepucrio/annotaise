import type { Meta, StoryObj } from '@storybook/nextjs-vite';

/** Escala de tipografia. Documentação em frontend/TYPOGRAPHY.md. */
const meta = {
  title: 'Design System/Tipografia',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function Row({ token, spec, children }: { token: string; spec: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[14rem_1fr] items-baseline gap-6 border-b py-4">
      <div>
        <code className="t-code">{token}</code>
        <div className="t-helper mt-0.5">{spec}</div>
      </div>
      <div>{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="t-overline mb-4">{title}</h2>
      {children}
    </section>
  );
}

export const Escala: Story = {
  render: () => (
    <div className="min-h-screen p-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-display">Tipografia Annotaise</h1>
        <p className="t-prose mt-2 mb-10">
          Cada papel carrega tamanho, entrelinha, peso e tracking. Não se acrescenta font-semibold nem leading-* em cima.
        </p>

        <Section title="Escala">
          <Row token="text-display" spec="30/38 · 600">
            <span className="text-display">Entrar no Annotaise</span>
          </Row>
          <Row token="text-title-1" spec="24/32 · 600 · h1">
            <span className="text-title-1">Rotulações</span>
          </Row>
          <Row token="text-title-2" spec="20/28 · 600 · h2">
            <span className="text-title-2">Nova rotulação</span>
          </Row>
          <Row token="text-title-3" spec="18/26 · 600 · h3">
            <span className="text-title-3">Concordância entre anotadores</span>
          </Row>
          <Row token="text-title-4" spec="16/24 · 600 · h4">
            <span className="text-title-4">Distribuição de itens</span>
          </Row>
          <Row token="text-body-lg" spec="16/26 · 400 · leitura">
            <span className="text-body-lg">Leia o contexto antes de responder cada questão do item.</span>
          </Row>
          <Row token="text-body" spec="14/20 · 400 · padrão da UI">
            <span className="text-body">Importe os itens por CSV e convide os anotadores.</span>
          </Row>
          <Row token="text-caption" spec="12/16 · 400 · metadado">
            <span className="text-caption">Atualizado há 3 dias · 142 itens</span>
          </Row>
          <Row token=".t-overline" spec="11/14 · 600 · MAIÚSCULAS">
            <span className="t-overline">3 anotadores por item</span>
          </Row>
          <Row token="text-metric" spec="20/20 · 700 · número">
            <span className="text-metric t-tabular">1.284</span>
          </Row>
          <Row token=".t-code" spec="13/20 · mono">
            <span className="t-code">labeling_id=42</span>
          </Row>
        </Section>
      </div>
    </div>
  ),
};
