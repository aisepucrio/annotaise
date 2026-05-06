import { useState } from 'react';
import type { ContextModule, ResponseContextModuleProps, UserContextModuleProps } from '../types';
import { MediaError } from './shared';

function isYouTubeUrl(value: string): boolean {
  return value.includes('youtube.com/watch') || value.includes('youtu.be/') || value.includes('youtube.com/shorts');
}

function getYouTubeEmbedUrl(value: string): string {
  const shortMatch = value.match(/youtu\.be\/([^?&]+)/);
  if (shortMatch) return `https://www.youtube-nocookie.com/embed/${shortMatch[1]}`;

  const shortsMatch = value.match(/youtube\.com\/shorts\/([^?&]+)/);
  if (shortsMatch) return `https://www.youtube-nocookie.com/embed/${shortsMatch[1]}`;

  const watchMatch = value.match(/[?&]v=([^?&]+)/);
  if (watchMatch) return `https://www.youtube-nocookie.com/embed/${watchMatch[1]}`;

  return value;
}

function VideoContextValue({ value, invalidText }: { value: string; invalidText: string }) {
  const [hasError, setHasError] = useState(false);
  const raw = value.trim();

  if (!raw || hasError) {
    return <MediaError text={invalidText} />;
  }

  if (isYouTubeUrl(raw)) {
    return (
      <iframe
        src={getYouTubeEmbedUrl(raw)}
        className="aspect-video w-full max-h-[50vh]"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
      />
    );
  }

  return (
    <video controls className="w-full max-h-[50vh]" onError={() => setHasError(true)}>
      <source src={raw} />
    </video>
  );
}

// =+=+=+=+= FORM
function AdminForm() {
  return null;
}

// =-=-=-=-= LABELING
function UserLabeling({ formattedValue, t }: UserContextModuleProps) {
  return <VideoContextValue value={formattedValue} invalidText={t('answer.context.invalidVideo')} />;
}

// =:=:=:=:= VIZUALIZATION
function ResponseVisualization({ formattedValue, t }: ResponseContextModuleProps) {
  return <VideoContextValue value={formattedValue} invalidText={t('answer.context.invalidVideo')} />;
}

export const VideoContextModule: ContextModule = {
  dataType: 'video',
  AdminForm,
  UserLabeling,
  ResponseVisualization,
};

export default VideoContextModule;
