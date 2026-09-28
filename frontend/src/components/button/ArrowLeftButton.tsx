'use client'; 
import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';   

//botão simples sem o controle da navegação. Colocar isso no page.tsx do form

interface ArrowButtonProps {
    onPrevious: () => void; //recebe nenhum parâmetro e não retorna nada
    disablePrevious?: boolean; //caso chegue no id = 1
}

const ArrowLeftButton: React.FC<ArrowButtonProps> = (
    {onPrevious,
     disablePrevious = false,}) => {
        return (
                <button
                    onClick={onPrevious}
                    disabled={disablePrevious}
                    className="px-4 py-2 bg-blueberry-700 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                    
                >
                   <ArrowLeft /> 
                </button>

            );
};

export default ArrowLeftButton;

