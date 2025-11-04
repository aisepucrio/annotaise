import { Trash2, PlusCircle, PlusSquare } from "lucide-react";
import QuestionBlock from "./question_block";
import ContextBlock from "./context_block";

export type SectionData = {
  id: string;
  title: string;
  contexts: { id: string }[];
  questions: { id: string }[];
};

type Props = {
  data: SectionData;
  index: number;          // 0-based
  total: number;
  columns?: string[];
  onAddContext: () => void;
  onAddQuestion: () => void;
  onAddSection: () => void;
  onChangeTitle: (title: string) => void;
  onRemoveSection?: () => void;
};

export default function SectionForm({
  data,
  index,
  total,
  columns = [],
  onAddContext,
  onAddQuestion,
  onAddSection,
  onChangeTitle,
  onRemoveSection,
}: Props) {
  const humanIndex = index + 1;

  return (
    <div className="relative border border-blue-800 rounded-xl p-5 pr-14">
      {/* Etiqueta "Seção X de Y" */}
      <div className="inline-flex -mt-9 mb-3 ml-2">
        <span className="px-3 py-1 bg-blue-900 text-white text-xs rounded-t-md rounded-br-md shadow">
          Seção {humanIndex} de {total}
        </span>
      </div>

      {/* Header da seção */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-blue-900 font-semibold">Título da seção</h2>
        <button
          type="button"
          className="text-gray-400 hover:text-red-500"
          onClick={onRemoveSection}
          aria-label="Remover seção"
          title="Remover seção"
        >
          <Trash2 />
        </button>
      </div>

      <input
        type="text"
        value={data.title}
        onChange={(e) => onChangeTitle(e.target.value)}
        placeholder={`Título da seção ${humanIndex}`}
        className="w-full border-b-2 border-blue-800 focus:outline-none text-gray-700 text-lg mb-4"
      />

      {/* CONTEXTOS */}
      {data.contexts.map((ctx) => (
        <ContextBlock key={ctx.id} columns={columns} />
      ))}

      {/* PERGUNTAS */}
      {data.questions.map((q) => (
        <QuestionBlock key={q.id} />
      ))}

      {/* Trilho lateral com botões (sobrepondo levemente a seção) */}
      <div className="absolute right-[-18px] top-0 bottom-0 flex items-start z-10">
        {/* trilho cinza */}
        <div className="w-1 bg-gray-300 rounded-full h-full mr-2" />

        <div className="flex flex-col gap-2 pt-12">
          {/* Adicionar pergunta */}
          <button
            type="button"
            onClick={onAddQuestion}
            title="Adicionar pergunta"
            aria-label="Adicionar pergunta"
            className="w-10 h-10 bg-blue-900 hover:bg-blue-800 text-white rounded-md shadow flex items-center justify-center"
          >
            <PlusCircle size={20} />
          </button>

          {/* Adicionar contexto */}
          <button
            type="button"
            onClick={onAddContext}
            title="Adicionar contexto"
            aria-label="Adicionar contexto"
            className="w-10 h-10 bg-blue-900 hover:bg-blue-800 text-white rounded-md shadow flex items-center justify-center"
          >
            <PlusCircle size={20} />
          </button>

          {/* Adicionar seção */}
          <button
            type="button"
            onClick={onAddSection}
            title="Adicionar seção"
            aria-label="Adicionar seção"
            className="w-10 h-10 bg-blue-900 hover:bg-blue-800 text-white rounded-md shadow flex items-center justify-center"
          >
            <PlusSquare size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
