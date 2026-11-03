import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { badge, buttonBase, buttonSize, surface, text } from '@/styles/typography';

/**
 * Referência visual do sistema de tipografia e superfícies.
 * Spec escrita: frontend/TYPOGRAPHY.md
 */
const meta = {
  title: 'Design System/Tipografia',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function Row({ token, spec, children }: { token: string; spec: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[14rem_1fr] items-baseline gap-6 border-b border-metal-100 py-4">
      <div>
        <code className="t-code text-text-brand">{token}</code>
        <div className="t-helper mt-0.5">{spec}</div>
      </div>
      <div>{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="t-overline mb-4 text-text-muted">{title}</h2>
      {children}
    </section>
  );
}

export const Escala: Story = {
  render: () => (
    <div className="bg-metal-50 min-h-screen p-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-display text-text-brand-strong">Tipografia Annotaise</h1>
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
            <span className="text-caption text-text-muted">Atualizado há 3 dias · 142 itens</span>
          </Row>
          <Row token=".t-overline" spec="11/14 · 600 · MAIÚSCULAS">
            <span className="t-overline text-text-muted">3 anotadores por item</span>
          </Row>
          <Row token="text-metric" spec="20/20 · 700 · número">
            <span className="text-metric t-tabular text-text-brand">1.284</span>
          </Row>
          <Row token=".t-code" spec="13/20 · mono">
            <span className="t-code">labeling_id=42</span>
          </Row>
        </Section>

        <Section title="Cores de texto">
          <div className={surface.card}>
            <div className="space-y-2">
              {(
                [
                  ['text-text-primary', 'Título e texto principal'],
                  ['text-text-secondary', 'Corpo secundário, rótulo'],
                  ['text-text-muted', 'Metadado, apoio, helper'],
                  ['text-text-disabled', 'Placeholder, desabilitado'],
                  ['text-text-brand', 'Link, ação, ênfase de marca'],
                  ['text-text-danger', 'Erro de domínio, atraso'],
                  ['text-text-success', 'Concluído'],
                  ['text-text-warning', 'Atenção, pendente'],
                ] as const
              ).map(([cls, label]) => (
                <div key={cls} className="flex items-baseline gap-4">
                  <code className="t-code w-56 shrink-0 text-text-muted">{cls}</code>
                  <span className={`text-body ${cls}`}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Botões">
          <div className={`${surface.card} flex flex-wrap items-center gap-4`}>
            {(['sm', 'md', 'lg'] as const).map((size) => (
              <button
                key={size}
                className={`${buttonBase} ${buttonSize[size]} bg-blueberry-700 text-text-inverse hover:bg-blueberry-900`}
              >
                Salvar ({size})
              </button>
            ))}
            {(['icon-sm', 'icon', 'icon-lg'] as const).map((size) => (
              <button key={size} className={`${buttonBase} ${buttonSize[size]} bg-metal-100 text-text-secondary`}>
                +
              </button>
            ))}
          </div>
        </Section>

        <Section title="Badges">
          <div className={`${surface.card} flex flex-wrap items-center gap-3`}>
            <span className={`${badge.status} bg-green-blueberry-15 text-text-success`}>Concluída</span>
            <span className={`${badge.status} bg-red-blueberry-15 text-text-danger`}>Atrasada</span>
            <span className={`${badge.status} bg-blueberry-700-15 text-text-brand`}>Em andamento</span>
            <span className={`${badge.count} bg-metal-100 text-text-secondary`}>142 itens</span>
          </div>
        </Section>

        <Section title="Caixas">
          <div className="grid grid-cols-2 gap-6">
            <div className={surface.card}>
              <h3 className="text-title-3">surface-card</h3>
              <p className="text-body text-text-secondary mt-1">Raio 12px, sombra card, padding 16px.</p>
            </div>
            <div className={surface.panel}>
              <h3 className="text-title-3">surface-panel</h3>
              <p className="text-body text-text-secondary mt-1">Borda metal-100, sem elevação, padding 24px.</p>
            </div>
            <div className={surface.modal}>
              <h3 className="text-title-3">surface-modal</h3>
              <p className="text-body text-text-secondary mt-1">Raio 16px, sombra overlay, padding 24px.</p>
            </div>
            <div className={surface.inset}>
              <h3 className="text-title-4">surface-inset</h3>
              <p className="text-body text-text-secondary mt-1">Fundo metal-50, recuo dentro de um card.</p>
            </div>
          </div>
        </Section>

        <Section title="Composição real">
          <div className={surface.header + ' rounded-2xl'}>
            <h1 className={text.pageTitle}>Rotulações</h1>
            <p className="text-body text-blue-50/80 mt-1">Gerencie as tarefas de anotação dos seus projetos.</p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-6">
            <div className={surface.cardInteractive}>
              <span className="t-overline text-text-muted">Projeto Alfa</span>
              <h3 className="text-title-3 mt-1">Classificação de sentimento</h3>
              <p className="text-body text-text-secondary mt-2">3 anotadores por item · desempate por LLM ativo.</p>
              <div className="mt-4 flex gap-px">
                <div className={`${badge.metric} rounded-r-none bg-blueberry-700-15 text-text-brand`}>
                  <span className="text-metric t-tabular">842</span>
                  <span>respondidos</span>
                </div>
                <div className={`${badge.metric} rounded-l-none bg-orange-blueberry-15 text-text-warning`}>
                  <span className="text-metric t-tabular">96</span>
                  <span>pendentes</span>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-caption text-text-muted">Prazo em 12 dias</span>
                <button className={`${buttonBase} ${buttonSize.sm} bg-blueberry-700 text-text-inverse`}>Abrir</button>
              </div>
            </div>

            <div className={surface.panel}>
              <h3 className="text-title-3">Campos</h3>
              <div className="mt-4 space-y-6">
                <div>
                  <label className="t-label block mb-1">Título da rotulação</label>
                  <input
                    className="w-full rounded-md border-[0.12rem] border-metal-500 px-3 py-2 text-body text-text-secondary"
                    defaultValue="Classificação de sentimento"
                  />
                  <p className="t-helper mt-1">Aparece na lista dos anotadores.</p>
                </div>
                <div>
                  <label className="t-label block mb-1">Anotadores por item</label>
                  <input className="w-full rounded-md border-[0.12rem] border-red-400 px-3 py-2 text-body" defaultValue="0" />
                  <p className="t-error mt-1">Precisa ser no mínimo 1.</p>
                </div>
              </div>
            </div>
          </div>
        </Section>
      </div>
    </div>
  ),
};
