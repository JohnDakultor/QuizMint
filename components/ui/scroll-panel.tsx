"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ScrollPanelProps = {
  children: ReactNode;
  maxHeightClassName?: string;
  viewportClassName?: string;
} & HTMLAttributes<HTMLDivElement>;

export function ScrollPanel({
  children,
  className,
  maxHeightClassName,
  viewportClassName,
  ...props
}: ScrollPanelProps) {
  return (
    <div
      className={cn("min-w-0 overflow-hidden rounded-2xl border bg-white", className)}
      {...props}
    >
      <div
        className={cn(
          "premium-scrollbar overflow-y-auto px-4 py-4 pr-3",
          maxHeightClassName,
          viewportClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
