"use client";

import { useState, ReactNode } from "react";

interface TooltipProps {
  children: ReactNode;
  label: string;
  position?: "top" | "right" | "bottom" | "left";
}

export default function Tooltip({ children, label, position = "right" }: TooltipProps) {
  const [show, setShow] = useState(false);

  const positionClasses: Record<string, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          role="tooltip"
          className={`absolute z-50 whitespace-nowrap px-2.5 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs font-medium rounded-lg shadow-xl pointer-events-none animate-in fade-in zoom-in-95 duration-100 ${positionClasses[position]}`}
        >
          {label}
          <div className={`absolute bg-gray-900 dark:bg-gray-700 w-2 h-2 rotate-45
            ${position === "right" ? "top-1/2 -translate-y-1/2 -left-1" : ""}
            ${position === "left" ? "top-1/2 -translate-y-1/2 -right-1" : ""}
            ${position === "top" ? "left-1/2 -translate-x-1/2 -bottom-1" : ""}
            ${position === "bottom" ? "left-1/2 -translate-x-1/2 -top-1" : ""}
          `} />
        </div>
      )}
    </div>
  );
}
