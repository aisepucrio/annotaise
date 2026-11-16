import Tooltip from '../Tooltip';

type PageHeaderProps = {
  page_title: string;
  description?: string;
  tooltip?: string;
};

export default function PageHeader({ page_title, description, tooltip }: PageHeaderProps) {
  return (
    <header className="mr-6 mt-4">
      <div className="surface-header rounded-r-2xl flex">
        <div className="w-3 h-auto bg-blue-50 rounded-xs shrink-0"></div>
        <div className="flex-col ml-4">
          <div className="flex items-center gap-2">
            <h1 className="text-title-1 text-text-inverse text-left">{page_title}</h1>
            {tooltip && <Tooltip content={tooltip} color="white" size="md" />}
          </div>
          {description && <p className="text-body text-blue-100 mt-1">{description}</p>}
        </div>
      </div>
    </header>
  );
}
