import { useState } from 'react';
import type { ContextModule, ResponseContextModuleProps, UserContextModuleProps } from '../types';
import { MediaError } from './shared';

function PdfContextValue({ value, invalidText }: { value: string; invalidText: string }) {
  const [hasError, setHasError] = useState(false);
  const raw = value.trim();

  if (!raw || hasError) {
    return <MediaError text={invalidText} />;
  }

  return <iframe src={raw} className="w-full" style={{ height: '60vh' }} onError={() => setHasError(true)} />;
}

// =+=+=+=+= FORM
function AdminForm() {
  return null;
}

// =-=-=-=-= LABELING
function UserLabeling({ formattedValue, t }: UserContextModuleProps) {
  return <PdfContextValue value={formattedValue} invalidText={t('answer.context.invalidPdf')} />;
}

// =:=:=:=:= VIZUALIZATION
function ResponseVisualization({ formattedValue, t }: ResponseContextModuleProps) {
  return <PdfContextValue value={formattedValue} invalidText={t('answer.context.invalidPdf')} />;
}

export const PdfContextModule: ContextModule = {
  dataType: 'pdf',
  AdminForm,
  UserLabeling,
  ResponseVisualization,
};

export default PdfContextModule;
