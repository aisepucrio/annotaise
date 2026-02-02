"use client";

import type { LabelingStructureElement } from "@/lib/services/labeling_create_service";
import { formatPayloadValue } from "./answer_utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState } from "react";

type ContextRowProps = {
  element: LabelingStructureElement;
  payload: Record<string, unknown>;
  t: (key: string, params?: Record<string, string | number>) => string;
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

function isValidImageSource(value: string): boolean {
  return isValidImageUrl(value) || isValidBase64Image(value);
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
    if (element.context_type === "image" && hasValue) {
      return (
        <ImageContext
          value={formattedValue}
          errorMessage={t("answer.context.invalidImage")}
        />
      );
    }

    const markdownValue =
      element.context_type === "code"
        ? `\`\`\`\n${formattedValue}\n\`\`\``
        : formattedValue;

    return (
      <div className="prose prose-sm max-w-none text-gray-800">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {markdownValue}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <>
      <div className="text-right mt-12 mb-0">
        <div className=" inline-block text-metal-900 text-sm font-normal border-b-3 border-blueberry-700">
          <div className="p-1">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {contextLabel}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      <div className=" border-b-3 border-r-3 border-blueberry-700 p-5">
        {renderContent()}
      </div>
    </>
  );
}
