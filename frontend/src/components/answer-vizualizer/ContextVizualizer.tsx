"use client";

import { type ReactNode, useState } from "react";
import { Info } from "lucide-react";

type ContextVizualizerProps = {
  context?: ReactNode;
  answer?: ReactNode;
  contextType?: string | null;
  value?: unknown;
  text?: string;
  emptyText?: string;
  invalidImageText?: string;
  imageAlt?: string;
};

export default function ContextVizualizer({
  context,
  answer,
  contextType,
  value,
  text,
  emptyText = "-",
  invalidImageText = "Invalid image",
  imageAlt = "Context image",
}: ContextVizualizerProps) {
  const title = context ?? (text ? <>{text}</> : null);
  const shouldRenderAnswer = contextType === "image" || answer !== undefined;

  return (
    <article className="py-3 first:pt-0 last:pb-0">
      {title ? (
        <div className="not-prose flex items-center gap-2">
          <Info
            size={18}
            className="shrink-0 text-blueberry-700"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1 prose prose-sm prose-p:my-0 max-w-none text-metal-900 prose-a:text-blueberry-700 prose-a:visited:text-blueberry-700">
            {title}
          </div>
        </div>
      ) : null}

      {shouldRenderAnswer ? (
        <div className="mt-2 break-words rounded-md bg-blueberry-700-25 px-3 py-2 text-sm text-metal-700">
          {contextType === "image" ? (
            <ContextImageValue
              value={value}
              emptyText={emptyText}
              invalidImageText={invalidImageText}
              imageAlt={imageAlt}
            />
          ) : (
            <div className="prose prose-sm max-w-none text-metal-700 prose-a:text-blueberry-700 prose-a:visited:text-blueberry-700">
              {answer}
            </div>
          )}
        </div>
      ) : null}
    </article>
  );
}

function ContextImageValue({
  value,
  emptyText,
  invalidImageText,
  imageAlt,
}: {
  value: unknown;
  emptyText: string;
  invalidImageText: string;
  imageAlt: string;
}) {
  const [hasError, setHasError] = useState(false);
  const raw = typeof value === "string" ? value.trim() : "";

  if (!raw) {
    return <p className="text-sm text-gray-700">{emptyText}</p>;
  }

  if (hasError) {
    return (
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
          {invalidImageText}
        </p>
        <p className="break-words text-sm text-gray-700">{raw}</p>
      </div>
    );
  }

  return (
    <img
      src={normalizeImageSrc(raw)}
      alt={imageAlt}
      className="mx-auto max-h-[22rem] w-auto max-w-full rounded-md border border-blue-100 object-contain"
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
}

function normalizeImageSrc(value: string): string {
  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:image/")
  ) {
    return value;
  }

  if (value.length >= 100 && /^[A-Za-z0-9+/=]+$/.test(value)) {
    return `data:image/png;base64,${value}`;
  }

  return value;
}
