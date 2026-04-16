"use client";

import type { TranslateFn } from "@/i18n/types";
import type { LabelingStructureElement } from "@/modules/labelings/labelingsTypes";
import { formatPayloadValue } from "./answer_utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useEffect, useRef, useState } from "react";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";


type ContextRowProps = {
  element: LabelingStructureElement;
  payload: Record<string, unknown>;
  t: TranslateFn;
};

function isValidImageUrl(value: string): boolean {
  if (!value || typeof value !== "string") return false;

  // Check if it's a URL (http/https)
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return true;
  }

  return false;
}

function isValidBase64Image(value: string): boolean {
  if (!value || typeof value !== "string") return false;

  // Check if it's a data URL with image mime type
  if (value.startsWith("data:image/")) {
    return true;
  }

  // Check if it looks like raw base64 (try to validate)
  const base64Regex = /^[A-Za-z0-9+/=]+$/;
  if (base64Regex.test(value) && value.length > 100) {
    return true;
  }

  return false;
}

function getImageSrc(value: string): string {
  // If it's a URL, use it directly
  if (isValidImageUrl(value)) {
    return value;
  }

  // If it's already a data URL, use it directly
  if (value.startsWith("data:image/")) {
    return value;
  }

  // Assume it's raw base64 and wrap with PNG mime type
  return `data:image/png;base64,${value}`;
}

function ImageContext({
  value,
  errorMessage,
}: {
  value: string;
  errorMessage: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">
        {errorMessage}
      </div>
    );
  }

  // Try to render any value as an image - let onError handle invalid sources
  if (!value || typeof value !== "string" || value.trim() === "") {
    return (
      <div className="flex items-center justify-center rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">
        {errorMessage}
      </div>
    );
  }

  return (
    <img
      src={getImageSrc(value)}
      alt="Context image"
      className="max-w-full h-auto max-h-[50vh] mx-auto"
      onError={() => setHasError(true)}
    />
  );
}

function CodeContext({ value }: { value: string }) {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      codeRef.current.removeAttribute("data-highlighted");
      codeRef.current.textContent = value;
      hljs.highlightElement(codeRef.current);
    }
  }, [value]);

  return (
    <pre className="rounded-md overflow-x-auto text-sm m-0">
      <code ref={codeRef} />
    </pre>
  );
}


function isYouTubeUrl(value: string): boolean {
  return (
    value.includes("youtube.com/watch") ||
    value.includes("youtu.be/") ||
    value.includes("youtube.com/shorts")
  );
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



function VideoContext({
  value,
  errorMessage,
}: {
  value: string;
  errorMessage: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (!value || typeof value !== "string" || value.trim() === "") {
    return (
      <div className="flex items-center justify-center rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">
        {errorMessage}
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">
        {errorMessage}
      </div>
    );
  }

  if (isYouTubeUrl(value)) {
    return (
      <iframe
        src={getYouTubeEmbedUrl(value)}
        className="w-full max-h-[50vh] aspect-video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
      />
    );
  }

  return (
    <video
      controls
      className="w-full max-h-[50vh]"
      onError={() => setHasError(true)}
    >
      <source src={value} />
    </video>
  );
}

function PdfContext({
  value,
  errorMessage,
}: {
  value: string;
  errorMessage: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (!value || typeof value !== "string" || value.trim() === "") {
    return (
      <div className="flex items-center justify-center rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">
        {errorMessage}
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">
        {errorMessage}
      </div>
    );
  }

  return (
    <iframe
      src={value}
      className="w-full"
      style={{ height: "60vh" }}
      onError={() => setHasError(true)}
    />
  );
}

function AudioContext({
  value,
  errorMessage,
}: {
  value: string;
  errorMessage: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (!value || typeof value !== "string" || value.trim() === "") {
    return (
      <div className="flex items-center justify-center rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">
        {errorMessage}
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">
        {errorMessage}
      </div>
    );
  }

  return (
    <audio
      controls
      className="w-full"
      onError={() => setHasError(true)}
    >
      <source src={value} />
    </audio>
  );
}

export default function ContextRow({ element, payload, t }: ContextRowProps) {
  const value = element.column_name ? payload[element.column_name] : undefined;
  const hasValue = value !== undefined && value !== null;
  const contextLabel = element.text?.trim()
    ? element.text
    : element.column_name || t("answer.context.title");
  const formattedValue = hasValue
    ? formatPayloadValue(value)
    : t("answer.context.noValue");

  const renderContent = () => {
      if(element.context_type === "pdf" && hasValue) {
        return (
         <PdfContext
            value={formattedValue}
            errorMessage={t("answer.context.invalidPdf")}
          />
        );
      }

      if (element.context_type === "video" && hasValue) {
        return (
          <VideoContext
            value={formattedValue}
            errorMessage={t("answer.context.invalidVideo")}
          />
        );
      }

      if (element.context_type === "audio" && hasValue) {
        return (
          <AudioContext
            value={formattedValue}
            errorMessage={t("answer.context.invalidAudio")}
          />
        );
      }

    if (element.context_type === "image" && hasValue) {
      return (
        <ImageContext
          value={formattedValue}
          errorMessage={t("answer.context.invalidImage")}
        />
      );
    }

    if (element.context_type === "code") {
      return <CodeContext value={formattedValue} />;
    }

    return (
      <div className="prose prose-sm max-w-none text-gray-800">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {formattedValue}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <>
      <div className="text-left mt-12 mb-0">
        <div className=" inline-block text-metal-900 text-md font-normal  border-blueberry-700">
          <div className="p-1">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {contextLabel}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      <div
        className="border-t-6 border-l-6 p-5 shadow-md rounded-br-xl rounded-ss-3xl bg-blueberry-700-15"
        style={{
          borderTopColor: "var(--blueberry-700)",
          borderLeftColor: "var(--blueberry-700)",
        }}
      >
        {renderContent()}
      </div>
    </>
  );
}

