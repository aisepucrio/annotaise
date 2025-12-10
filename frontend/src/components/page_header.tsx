// PageHeader.tsx
import { Info } from "lucide-react";
import { Tooltip } from "./ui/tooltip";

type PageHeaderProps = {
  page_title: string;
  description?: string;
  tooltip?: string;
};

export default function PageHeader({
  page_title,
  description,
  tooltip,
}: PageHeaderProps) {
  return (
    <header className="ml-4 mr-6 mt-4">
      <div className="rounded-2xl bg-[var(--blueberry-700)] text-[var(--blue-50)] shadow-md p-5 flex">
        <div className="w-5 h-auto bg-[var(--blue-50)]  rounded-xs shrink-0"></div>
        <div className="flex-col ml-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-semibold leading-tight text-left">
              {page_title}
            </h1>
            {tooltip ? (
              <Tooltip content={tooltip}>
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white cursor-default hover:bg-white/10 hover:opacity-80 transition"
                  aria-label={`Mais informações sobre ${page_title}`}
                >
                  <Info size={20} strokeWidth={2.25} />
                </span>
              </Tooltip>
            ) : null}
          </div>
          {description && (
            <p className="text-sm md:text-base text-blue-100 mt-1">
              {description}
            </p>
          )}
        </div>
      </div>
    </header>
  );
}
