"use client";

import { useId, cloneElement } from "react";
import { Tooltip as ReactTooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";

type TooltipProps = {
  content: string;
  children: React.ReactElement<TooltipTriggerProps>;
  place?: "top" | "bottom" | "left" | "right";
};

type TooltipTriggerProps = {
  onMouseEnter?: React.MouseEventHandler;
  onMouseLeave?: React.MouseEventHandler;
} & Record<string, unknown>;

export function Tooltip({ content, children, place = "bottom" }: TooltipProps) {
  const tooltipId = useId();

  const trigger = cloneElement(children, {
    "data-tooltip-id": tooltipId,
    "data-tooltip-content": content,
    onMouseEnter: (e: React.MouseEvent) => {
      children.props.onMouseEnter?.(e);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      children.props.onMouseLeave?.(e);
    },
  });

  return (
    <>
      {trigger}
      <ReactTooltip
        id={tooltipId}
        place={place}
        positionStrategy="fixed"
        opacity={0.9}
        style={{ zIndex: 9999 }}
        className="z-[9999] bg-white! text-black! font-normal! border! border-gray-200! rounded-md! px-3! py-2! text-sm! shadow-sm! opacity-100! hover:opacity-80! transition-opacity duration-150 max-w-md! whitespace-pre-wrap!"
      />
    </>
  );
}
