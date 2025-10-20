// PageHeader.tsx
type PageHeaderProps = {
  page_title: string;
  description?: string;
};

export default function PageHeader({ page_title, description }: PageHeaderProps) {
  return (
    
    <header className="ml-4 mr-6 mt-4">
      <div className="rounded-2xl bg-blue-900 text-white shadow-md p-5">
        
        <h1 className="text-xl md:text-2xl font-semibold leading-tight">
          {page_title}
        </h1>
        {description && (
          <p className="text-sm md:text-base text-blue-100 mt-1">
            {description}
          </p>
        )}
      </div>
    </header>
  );
}
