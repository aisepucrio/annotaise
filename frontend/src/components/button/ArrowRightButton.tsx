'use client'; 
import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';   

//botão simples sem o controle da navegação. Colocar isso no page.tsx do form

interface ArrowButtonProps {
    onNext: () => void; 
    disableNext?: boolean;
}

const ArrowRightButton: React.FC<ArrowButtonProps> = (
    {onNext,
     disableNext = false}) => {
        return (
                <button
                    onClick={onNext}
                    disabled={disableNext}
                    className="px-4 py-2 bg-blueberry-700 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                >
                   <ArrowRight /> 
                </button>

            );
};

export default ArrowRightButton;

