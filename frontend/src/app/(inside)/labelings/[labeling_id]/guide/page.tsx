"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { fetchLabelingById } from "@/modules/labelings/labelingService";
import { useTranslations } from "@/i18n/use-translations";

export default function LabelingGuidePage() {
  const { t } = useTranslations();
  const params = useParams<{ id: string }>();
  const labelingId = useMemo(() => {
    const parsed = Number(params?.id);
    return Number.isFinite(parsed) ? parsed : NaN;
  }, [params]);

  const [guideText, setGuideText] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadGuide = async () => {
      if (Number.isNaN(labelingId)) {
        setError(t("guide.invalidId"));
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const labeling = await fetchLabelingById(labelingId);
        setGuideText(labeling.guide ?? "");
        setTitle(labeling.title ?? t("guide.title"));
      } catch {
        setError(t("guide.loadError"));
      } finally {
        setLoading(false);
      }
    };

    void loadGuide();
  }, [labelingId, t]);

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8">
        <div className="flex items-center justify-between"></div>

        <div className=" bg-white p-4 ">
          {loading ? (
            <p className="text-sm text-gray-600">{t("guide.loading")}</p>
          ) : error ? (
            <p className="text-sm text-red-700">{error}</p>
          ) : guideText ? (
            <div className="prose prose-sm max-w-none text-gray-900">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {guideText}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-gray-600">{t("guide.noGuide")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
