'use client';

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';

import PageHeader from '@/components/inside-pages-layout/PageHeader';
import TableOfContents from '@/components/TableOfContents';
import { extractToc } from '@/lib/toc';
import { useLanguage } from '@/i18n/language-context';
import { useTranslations } from '@/i18n/use-translations';

type GuiaContentProps = {
  pt: string;
  en: string;
};

export default function GuiaContent({ pt, en }: GuiaContentProps) {
  const { t } = useTranslations();
  const { language } = useLanguage();

  const markdown = language === 'en' ? en : pt;
  const toc = useMemo(() => extractToc(markdown), [markdown]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <PageHeader page_title={t('guia.pageTitle')} description={t('guia.description')} />

      <div className="ml-5 mt-5 mr-6 min-h-0 flex-1 overflow-y-auto pb-10 pr-2">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_220px]">
          <article
            className="prose prose-slate max-w-none
              prose-headings:scroll-mt-4 prose-headings:text-blueberry-900
              prose-h1:text-2xl
              prose-h2:mt-10 prose-h2:border-t prose-h2:border-metal-100 prose-h2:pt-6 prose-h2:text-xl
              prose-h3:text-lg
              prose-p:text-metal-700
              prose-a:text-blueberry-500 prose-a:no-underline hover:prose-a:underline
              prose-strong:text-metal-900
              prose-li:text-metal-700
              prose-blockquote:border-l-blueberry-700 prose-blockquote:bg-blue-50 prose-blockquote:py-1
              prose-blockquote:not-italic prose-blockquote:text-metal-700
              prose-code:rounded prose-code:bg-metal-50 prose-code:px-1 prose-code:py-0.5 prose-code:text-blueberry-700
              prose-code:before:content-none prose-code:after:content-none
              prose-img:rounded-lg prose-img:border prose-img:border-metal-200"
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSlug]}
              components={{
                img: ({ node, ...props }) => <img loading="lazy" alt={props.alt ?? ''} {...props} />,
              }}
            >
              {markdown}
            </ReactMarkdown>
          </article>

          <TableOfContents items={toc} title={t('guia.toc.title')} ariaLabel={t('guia.toc.aria')} />
        </div>
      </div>
    </div>
  );
}
