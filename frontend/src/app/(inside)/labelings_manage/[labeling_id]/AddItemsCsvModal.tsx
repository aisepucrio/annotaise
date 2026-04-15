"use client";

import { Loader2, TriangleAlert, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import Modal from "@/components/modal/Modal";
import Button from "@/components/button/Button";
import { useTranslations } from "@/i18n/use-translations";

type AddItemsCsvModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (file: File) => Promise<void>;
};

export default function AddItemsCsvModal({
  open,
  onClose,
  onConfirm,
}: AddItemsCsvModalProps) {
  const { t } = useTranslations();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasEmptyFields, setHasEmptyFields] = useState(false);
  const [isAnalyzingFile, setIsAnalyzingFile] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelectedFile(null);
      setIsSubmitting(false);
      setHasEmptyFields(false);
      setIsAnalyzingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [open]);

  function validateFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      throw new Error(t("labelings.upload.error.invalidFileExtension"));
    }
  }

  function parseCsvLine(line: string): string[] {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        const nextChar = line[i + 1];
        if (inQuotes && nextChar === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        cells.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    cells.push(current);
    return cells;
  }

  async function parseHasEmptyFields(file: File) {
    setIsAnalyzingFile(true);
    try {
      const content = await file.text();
      const lines = content.split(/\r?\n/).filter((line) => line.trim() !== "");
      if (lines.length <= 1) {
        setHasEmptyFields(false);
        return;
      }

      const headers = parseCsvLine(lines[0]);
      const emptyFound = lines.slice(1).some((line) => {
        const cells = parseCsvLine(line);
        if (cells.length < headers.length) return true;
        return cells.some((cell) => cell.trim() === "");
      });

      setHasEmptyFields(emptyFound);
    } catch {
      setHasEmptyFields(false);
    } finally {
      setIsAnalyzingFile(false);
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      setHasEmptyFields(false);
      return;
    }

    try {
      validateFile(file);
      setSelectedFile(file);
      void parseHasEmptyFields(file);
    } catch (err) {
      setSelectedFile(null);
      setHasEmptyFields(false);
      const message =
        err instanceof Error
          ? err.message
          : t("labelings.upload.error.invalidFile");
      toast.error(message);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    try {
      validateFile(file);
      setSelectedFile(file);
      void parseHasEmptyFields(file);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t("labelings.upload.error.invalidFile");
      toast.error(message);
    }
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  async function handleConfirm() {
    if (!selectedFile) {
      toast.error(t("labelings.upload.error.missingFile"));
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(selectedFile);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t("labelings.addItemsCsv.error");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("labelings.addItemsCsv.title")}
      description={
        <p>
          {t("labelings.addItemsCsv.description")}
        </p>
      }
    >
      <div>
        <div
          className="flex flex-col items-center gap-3 border-2 border-dashed border-blueberry-700 rounded-xl p-6 text-center"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFile}
            className="hidden"
          />

          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzingFile || isSubmitting}
            icon={<Upload size={18} />}
            fill={false}
          >
            {t("labelings.upload.button")}
          </Button>

          <p className="text-xs text-gray-600">
            {selectedFile
              ? t("labelings.upload.selectedFile", {
                  name: selectedFile.name,
                })
              : t("labelings.upload.placeholder")}
          </p>

          {isAnalyzingFile && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("labelings.upload.analyzing")}
            </div>
          )}
        </div>

        {hasEmptyFields && (
          <div className="mt-4 rounded-lg border border-red-blueberry bg-red-50 px-3 py-2 text-sm text-red-blueberry">
            <TriangleAlert className="inline-block mr-1 mb-0.5 w-4 h-4" />
            {t("labelings.upload.emptyFields.textStart")}{" "}
            <strong>
              {t("labelings.upload.emptyFields.highlightEmpty")}
            </strong>{" "}
            {t("labelings.upload.emptyFields.textMiddle")}{" "}
            <strong>
              {t("labelings.upload.emptyFields.highlightMissingInfo")}
            </strong>
            ; {t("labelings.upload.emptyFields.textAfter")}{" "}
            <strong>
              {t("labelings.upload.emptyFields.highlightUnexpected")}
            </strong>
            , {t("labelings.upload.emptyFields.textEnd")}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button
            type="button"
            variant="white"
            fill={false}
            onClick={onClose}
            disabled={isSubmitting}
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedFile || isAnalyzingFile || isSubmitting}
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("labelings.upload.processing")}
              </span>
            ) : (
              t("labelings.addItemsCsv.confirm")
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
