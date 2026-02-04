import React from "react";

type LoaderProps = {
  variant?: "white" | "blue";
};

export default function Loader({ variant = "blue" }: LoaderProps) {
  const colorClass =
    variant === "white" ? "border-metal-50" : "border-blueberry-700";

  return (
    <div className="flex items-center justify-center w-full h-full min-h-[100px]">
      <div className="relative w-[2%] aspect-square min-w-10 max-w-20">
        {/* Trilho */}
        <div
          className={`absolute inset-0 rounded-full border-4 ${colorClass} opacity-20`}
        />

        {/* Spinner */}
        <div
          className={`
            absolute inset-0 rounded-full border-4 border-t-transparent ${colorClass}
            animate-spin motion-reduce:animate-none
            [animation-duration:0.8s]
          `}
        />
      </div>
    </div>
  );
}
