import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

type MarkdownContentProps = {
  children: ReactNode;
  inline?: boolean;
  className?: string;
};

export default function MarkdownContent({ children, inline = false, className }: MarkdownContentProps) {
  const Wrapper = inline ? 'span' : 'div';
  const classes = cn(
    'prose prose-sm max-w-none prose-p:my-0 prose-a:text-blueberry-700 prose-a:visited:text-blueberry-700',
    className
  );

  if (typeof children !== 'string') {
    return className ? <Wrapper className={classes}>{children}</Wrapper> : <>{children}</>;
  }

  return (
    <Wrapper className={classes}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={
          inline
            ? {
                p: ({ children: paragraphChildren }) => <span>{paragraphChildren}</span>,
              }
            : undefined
        }
      >
        {children}
      </ReactMarkdown>
    </Wrapper>
  );
}
