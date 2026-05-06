import { useState } from 'react';
import type { ContextModule, ResponseContextModuleProps, UserContextModuleProps } from '../types';

function normalizeImageSrc(value: string): string {
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:image/')) {
    return value;
  }

  if (value.length >= 100 && /^[A-Za-z0-9+/=]+$/.test(value)) {
    return `data:image/png;base64,${value}`;
  }

  return value;
}

function ImageContextValue({ value, emptyText, invalidText }: { value: unknown; emptyText: string; invalidText: string }) {
  const [hasError, setHasError] = useState(false);
  const raw = typeof value === 'string' ? value.trim() : '';

  if (!raw) {
    return <p className="text-sm text-gray-700">{emptyText}</p>;
  }

  if (hasError) {
    return (
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-red-600">{invalidText}</p>
        <p className="wrap-break-word text-sm text-gray-700">{raw}</p>
      </div>
    );
  }

  return (
    <img
      src={normalizeImageSrc(raw)}
      alt="Context image"
      className="mx-auto max-h-[50vh] w-auto max-w-full rounded-md border border-blue-100 object-contain"
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
}

// =+=+=+=+= FORM
function AdminForm() {
  return null;
}

// =-=-=-=-= LABELING
function UserLabeling({ value, t }: UserContextModuleProps) {
  return <ImageContextValue value={value} emptyText={t('answer.context.noValue')} invalidText={t('answer.context.invalidImage')} />;
}

// =:=:=:=:= VIZUALIZATION
function ResponseVisualization({ value, t }: ResponseContextModuleProps) {
  return <ImageContextValue value={value} emptyText={t('answer.context.noValue')} invalidText={t('answer.context.invalidImage')} />;
}

export const ImageContextModule: ContextModule = {
  dataType: 'image',
  AdminForm,
  UserLabeling,
  ResponseVisualization,
};

export default ImageContextModule;
