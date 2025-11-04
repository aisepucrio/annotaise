"use client";

import { X, Upload } from "lucide-react";
import { useRef, useState } from "react";

/**
 * Modal de upload de CSV (com opção de MOCK).
 * - Quando confirmamos, chamamos onConfirm(columns) com as colunas detectadas.
 * - Se o usuário escolher "Usar mock", usamos um CSV fictício padrão.
 */
export default function UploadCsvModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (columns: string[]) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [columnsPreview, setColumnsPreview] = useState<string[] | null>(null);

  if (!open) return null;

  function parseCsvHeader(text: string): string[] {
    // parser simples: pega só a primeira linha e separa por vírgula
    const firstLine = text.split(/\r?\n/)[0] ?? "";
    return firstLine
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setColumnsPreview(null);

    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Por favor, selecione um arquivo .csv");
      return;
    }

    const text = await file.text();
    const cols = parseCsvHeader(text);

    if (cols.length === 0) {
      setError("Não foi possível identificar colunas no CSV.");
      return;
    }

    setColumnsPreview(cols);
  }

  function handleUseMock() {
    // CSV fictício — somente para fluxo de mock
    const mockCsv = "id,texto,autor,data,prioridade\n1,Exemplo,Ana,2024-10-01,alta";
    const cols = parseCsvHeader(mockCsv);
    setColumnsPreview(cols);
  }

  function handleConfirm() {
    if (columnsPreview && columnsPreview.length > 0) {
      onConfirm(columnsPreview);
    } else {
      setError("Selecione um arquivo .csv ou use o mock.");
    }
  }

  return (
    <>
      {/* Overlay escurecido */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 relative">
          {/* Header */}
          <button
            onClick={onClose}
            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
          <h2 className="text-xl font-semibold text-center text-blue-900 mb-2">
            Nova rotulação
          </h2>
          <p className="text-center text-gray-500 text-sm mb-6">
            Por favor, faça upload de um arquivo <strong>.CSV</strong>.<br />
          </p>

          {/* Upload */}
          <div className="flex flex-col items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFile}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white px-5 py-2 shadow-md text-sm"
            >
              <Upload size={18} /> Upload
            </button>

            <button
              type="button"
              onClick={handleUseMock}
              className="text-blue-800 hover:text-blue-600 text-sm underline mt-1"
            >
              Usar CSV mock
            </button>

            {columnsPreview && (
              <div className="w-full mt-3">
                <span className="text-xs text-gray-600">Colunas detectadas:</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {columnsPreview.map((c) => (
                    <span
                      key={c}
                      className="rounded-md bg-blue-100 text-blue-800 text-xs px-2 py-1"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="w-full mt-3 text-sm text-red-600">{error}</div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="px-5 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-sm shadow"
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
