import { type ReactNode } from "react";

type SectionVizualizerProps = {
  title: ReactNode;
  children: ReactNode;
};

export default function SectionVizualizer({
  title,
  children,
}: SectionVizualizerProps) {
  return (
    <section className="border-l-4 border-blueberry-500 pl-4 py-1">
      <div className="prose prose-sm max-w-none text-blueberry-900 prose-a:text-blueberry-700 prose-a:visited:text-blueberry-700">
        {title}
      </div>
      <div className="mt-2 divide-y divide-metal-100">{children}</div>
    </section>
  );
}
