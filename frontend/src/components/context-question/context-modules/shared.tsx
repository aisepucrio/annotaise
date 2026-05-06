import MarkdownContent from '../MarkdownContent';

export function TextualContextValue({ value }: { value: string }) {
  return (
    <div className="prose prose-sm max-w-none text-gray-800 prose-a:text-blueberry-700 prose-a:visited:text-blueberry-700">
      <MarkdownContent>{value}</MarkdownContent>
    </div>
  );
}

export function MediaError({ text }: { text: string }) {
  return <div className="flex items-center justify-center rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">{text}</div>;
}
