import { type ReactNode } from 'react';

type SectionVizualizerProps = {
  title: ReactNode;
  children: ReactNode;
  sectionLabel?: ReactNode;
};

export default function SectionVizualizer({ title, children, sectionLabel }: SectionVizualizerProps) {
  const headerTitleClassName =
    'prose prose-sm max-w-none text-xs font-semibold uppercase tracking-wide text-slate-700 prose-p:my-0 prose-p:inline prose-p:text-sm prose-p:font-semibold prose-p:uppercase prose-p:tracking-wide prose-p:text-slate-700 prose-headings:my-0 prose-headings:inline prose-headings:text-sm prose-headings:font-semibold prose-headings:uppercase prose-headings:tracking-wide prose-headings:text-slate-700 prose-a:text-slate-700 prose-a:visited:text-slate-700';
  const internalTitleClassName =
    'prose prose-sm max-w-none text-center text-xs font-semibold uppercase tracking-wide text-slate-700 prose-p:my-0 prose-p:inline prose-p:text-sm prose-p:font-semibold prose-p:uppercase prose-p:tracking-wide prose-p:text-slate-700 prose-headings:my-0 prose-headings:inline prose-headings:text-sm prose-headings:font-semibold prose-headings:uppercase prose-headings:tracking-wide prose-headings:text-slate-700 prose-a:text-slate-700 prose-a:visited:text-slate-700';

  return (
    <section className="py-1">
      {sectionLabel ? (
        <div className="not-prose mt-1 mb-3 flex items-center gap-3">
          <div className="h-0.5 flex-1 bg-slate-200" aria-hidden="true" />
          <div className="min-w-0 shrink-0">
            <div className="flex min-w-0 flex-wrap items-center justify-center gap-2 text-center">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">{sectionLabel}</span>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-700" aria-hidden="true">
                —
              </span>
              <div className={headerTitleClassName}>{title}</div>
            </div>
          </div>
          <div className="h-0.5 flex-1 bg-slate-200" aria-hidden="true" />
        </div>
      ) : null}

      <div className="border-l-4 border-blueberry-500 pl-4 py-1">
        {!sectionLabel ? (
          <div className="not-prose mt-1 mb-4 flex items-center gap-3">
            <div className="h-0.5 flex-1 bg-slate-200" aria-hidden="true" />
            <div className="min-w-0 shrink">
              <div className={internalTitleClassName}>{title}</div>
            </div>
            <div className="h-0.5 flex-1 bg-slate-200" aria-hidden="true" />
          </div>
        ) : null}
        <div className="divide-y divide-metal-100">{children}</div>
      </div>
    </section>
  );
}
