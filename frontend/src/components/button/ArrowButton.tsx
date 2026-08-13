import React from 'react';
import {useNavigate} from 'react-router-dom';

interface ArrowButtonProps {
    currentId: string | number;
    allIds: (string | number)[];
    basePath: string;
}

const ArrowButton: React.FC<ArrowButtonProps> = (
    {currentId, 
        allIds, 
        basePath}) => {
        const navigate = useNavigate()
        const currentIndex = allIds.findIndex((id) => String(id) === String(currentId));

        const prevIndex = currentIndex - 1;
        const nextIndex = currentIndex + 1;
        
        const prevId = prevIndex >=0 ? allIds[prevIndex] : null;
        const nextId = nextIndex < allIds.length ? allIds[nextIndex] : null;
        
        const goToId = (id: string | number) => {
            navigate(`${basePath}/${id}`);
        };}


return (
    <div className="flex justify-between items-center w-full my-4">
        <button
            onClick={() => prevId !== null && goToId(prevId)}
            disabled={prevId === null}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed transition"
        >
            &larr; Previous Item
        </button>

        <button
            onClick={() => nextId !== null && goToId(nextId)}
            disabled={nextId === null}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed transition"
        >
            Next Item &rarr;
        </button>
        </div>
    );
};

export default ArrowButton;

