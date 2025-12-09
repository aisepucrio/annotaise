import { PlusCircle, PlusSquare, Trash2, CircleQuestionMark } from "lucide-react";

export default function ActionsSidebar(){
    return( 
      <div className="absolute top-0 right-0 p-6 items-start z-10">
        <div className="flex gap-2 ">

          <button
            type="button"
            onClick={onRemoveSection}
            title="Apagar Seção"
            className="w-10 h-10 bg-red-700 hover:bg-red-800 text-white rounded-md shadow flex items-center justify-center cursor-pointer"
          >
            <Trash2 size={20} />
          </button>
          
          <button
            type="button"
            onClick={onAddQuestion}
            title="Adicionar pergunta"
            className="w-10 h-10 bg-blue-900 hover:bg-blue-800 text-white rounded-md shadow flex items-center justify-center cursor-pointer"
          >
            <PlusCircle size={20} />
          </button>
          <button
            type="button"
            onClick={onAddContext}
            title="Adicionar contexto"
            className="w-10 h-10 bg-blue-900 hover:bg-blue-800 text-white rounded-md shadow flex items-center justify-center cursor-pointer"
          >
            <CircleQuestionMark size={20} />
          </button>
          <button
            type="button"
            onClick={onAddSection}
            title="Adicionar seção"
            className="w-10 h-10 bg-blue-900 hover:bg-blue-800 text-white rounded-md shadow flex items-center justify-center cursor-pointer"
          >
            <PlusSquare size={20} />
          </button>
        </div>
      </div>

    
    );

}