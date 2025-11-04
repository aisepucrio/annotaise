import { Trash2 } from "lucide-react";
import QuestionBlock from "./question_block";
import ContextBlock from "./context_block";

export default function SectionForm({ sectionIndex, totalSections }: { sectionIndex: number; totalSections: number }) {
  return (
    <div className="border border-blue-800 rounded-xl p-5 mb-6">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-blue-900 font-semibold">
          Seção {sectionIndex} de {totalSections}
        </h2>
        <Trash2 className="text-gray-400 hover:text-red-500 cursor-pointer" />
      </div>

      <input
        type="text"
        placeholder="Título da seção"
        className="w-full border-b-2 border-blue-800 focus:outline-none text-gray-700 text-lg mb-4"
      />

      {/* Contextos */}
      <ContextBlock />

      {/* Perguntas */}
      <QuestionBlock />
    </div>
  );
}
