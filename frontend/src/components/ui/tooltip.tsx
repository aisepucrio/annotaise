"use client";

import { useId, useState, cloneElement } from "react";
import { createPortal } from "react-dom";
import { Tooltip as ReactTooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";

type TooltipProps = {
  content: string;
  children: React.ReactElement;
  place?: "top" | "bottom" | "left" | "right";
};

export function Tooltip({ content, children, place = "bottom" }: TooltipProps) {
  const tooltipId = useId();
  const [hovered, setHovered] = useState(false);

  const trigger = cloneElement(children, {
    ...children.props,
    "data-tooltip-id": tooltipId,
    "data-tooltip-content": content,
    onMouseEnter: (e: React.MouseEvent) => {
      children.props.onMouseEnter?.(e);
      setHovered(true);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      children.props.onMouseLeave?.(e);
      setHovered(false);
    },
  });

  return (
    <>
      {createPortal(
        <div
          className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 pointer-events-none ${
            hovered ? "opacity-100" : "opacity-0"
          }`}
        />,
        document.body
      )}
      {trigger}
      <ReactTooltip
        id={tooltipId}
        place={place}
        opacity={0.9}
        className="z-50 !bg-white !text-black !border !border-gray-200 !rounded-md !px-3 !py-2 !text-sm !shadow-lg !opacity-95 hover:!opacity-80 transition-opacity duration-150 !max-w-md !whitespace-pre-wrap"
      />
    </>
  );
}
