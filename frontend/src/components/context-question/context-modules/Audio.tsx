import { useState } from 'react';
import type { ContextModule, ResponseContextModuleProps, UserContextModuleProps } from '../types';
import { MediaError } from './shared';

function AudioContextValue({ value, invalidText }: { value: string; invalidText: string }) {
  const [hasError, setHasError] = useState(false);
  const raw = value.trim();
  const sourceType = resolveAudioMimeType(raw);

  if (!raw || hasError) {
    return <MediaError text={invalidText} />;
  }

  return (
    <audio controls className="w-full" onError={() => setHasError(true)}>
      <source src={raw} type={sourceType} />
    </audio>
  );
}

function resolveAudioMimeType(value: string): string | undefined {
  if (value.startsWith('data:audio/')) {
    const semicolonIndex = value.indexOf(';');
    const commaIndex = value.indexOf(',');
    const endIndex = semicolonIndex >= 0 ? semicolonIndex : commaIndex;
    return endIndex > 5 ? value.slice(5, endIndex) : undefined;
  }

  const lowered = value.toLowerCase();
  if (lowered.endsWith('.mp3')) return 'audio/mpeg';
  if (lowered.endsWith('.wav')) return 'audio/wav';
  if (lowered.endsWith('.ogg')) return 'audio/ogg';
  if (lowered.endsWith('.m4a')) return 'audio/mp4';
  return undefined;
}

// =+=+=+=+= FORM
function AdminForm() {
  return null;
}

// =-=-=-=-= LABELING
function UserLabeling({ formattedValue, t }: UserContextModuleProps) {
  return <AudioContextValue value={formattedValue} invalidText={t('answer.context.invalidAudio')} />;
}

// =:=:=:=:= VIZUALIZATION
function ResponseVisualization({ formattedValue, t }: ResponseContextModuleProps) {
  return <AudioContextValue value={formattedValue} invalidText={t('answer.context.invalidAudio')} />;
}

export const AudioContextModule: ContextModule = {
  dataType: 'audio',
  AdminForm,
  UserLabeling,
  ResponseVisualization,
};

export default AudioContextModule;
