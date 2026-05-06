import { useEffect, useRef } from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';
import type { ContextModule, ResponseContextModuleProps, UserContextModuleProps } from '../types';

function CodeContextValue({ value }: { value: string }) {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!codeRef.current) return;
    codeRef.current.removeAttribute('data-highlighted');
    codeRef.current.textContent = value;
    hljs.highlightElement(codeRef.current);
  }, [value]);

  return (
    <pre className="m-0 overflow-x-auto rounded-md text-sm">
      <code ref={codeRef} />
    </pre>
  );
}

// =+=+=+=+= FORM
function AdminForm() {
  return null;
}

// =-=-=-=-= LABELING
function UserLabeling({ formattedValue }: UserContextModuleProps) {
  return <CodeContextValue value={formattedValue} />;
}

// =:=:=:=:= VIZUALIZATION
function ResponseVisualization({ formattedValue }: ResponseContextModuleProps) {
  return <CodeContextValue value={formattedValue} />;
}

export const CodeContextModule: ContextModule = {
  dataType: 'code',
  AdminForm,
  UserLabeling,
  ResponseVisualization,
};

export default CodeContextModule;
