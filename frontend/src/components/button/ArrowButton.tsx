'use client'; 
import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';   

//botão simples sem o controle da navegação. Colocar isso no itemTab

interface ArrowButtonProps {
    currentId: string | number; //caso o id sja '123-abcd' ou um numero qualquer
    onPrevious: () => void; //recebe nenhum parâmetro e não retorna nada
    onNext: () => void; 
    disablePrevious?: boolean; //caso chegue no id = 1
    disableNext?: boolean;


}

const ArrowButton: React.FC<ArrowButtonProps> = (
    {currentId,
     onPrevious,
     onNext,
     disablePrevious = false,
     disableNext = false}) => {
        return (
            <div className="flex justify-between items-center w-full my-4">
                <button
                    onClick={onPrevious}
                    disabled={disablePrevious}
                    className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                >
                   <ArrowRight /> Previous {/*Botão para voltar */}
                </button>

                 <span className="text-sm font-semibold text-gray-700">
                    Item {currentId}
                 </span>    {/*id do itemm pode ser mostrado entre os dois botões? Perguntar para o João */} {/*No caso de ser um container com  Previous       | Id do item|         Next */}
                <button
                    onClick={onNext}
                    disabled={disableNext}
                    className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed transition" 
                >
                    Next Item <ArrowRight /> {/*Botão para avançar (autoexplicativo :)) */}
                </button>
                </div>
            );
};

export default ArrowButton;

