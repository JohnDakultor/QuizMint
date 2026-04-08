"use client";

import { Children, type ReactNode, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type MasonryGridProps = {
  children: ReactNode;
  className?: string;
  itemClassName?: string;
};

export function MasonryGrid({ children, className, itemClassName }: MasonryGridProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const childArray = Children.toArray(children);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const styles = window.getComputedStyle(container);
      const rowGap = Number.parseFloat(styles.rowGap || styles.gap || "0") || 0;
      const autoRows = Number.parseFloat(styles.gridAutoRows || "1") || 1;

      itemRefs.current.forEach((item) => {
        if (!item) return;
        item.style.gridRowEnd = "auto";
        const measuredTarget = item.firstElementChild instanceof HTMLElement
          ? item.firstElementChild
          : item;
        const contentHeight = measuredTarget.getBoundingClientRect().height;
        const span = Math.max(1, Math.ceil((contentHeight + rowGap) / (autoRows + rowGap)));
        item.style.gridRowEnd = `span ${span}`;
      });
    };

    const scheduleMeasure = () => {
      window.requestAnimationFrame(() => {
        measure();
      });
    };

    scheduleMeasure();

    const resizeObserver = new ResizeObserver(() => {
      scheduleMeasure();
    });

    resizeObserver.observe(container);
    itemRefs.current.forEach((item) => {
      if (!item) return;
      resizeObserver.observe(item);
      if (item.firstElementChild instanceof HTMLElement) {
        resizeObserver.observe(item.firstElementChild);
      }
    });

    window.addEventListener("load", scheduleMeasure);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("load", scheduleMeasure);
    };
  }, [childArray.length]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "grid grid-cols-1 grid-flow-row-dense gap-6 [grid-auto-rows:8px]",
        className,
      )}
    >
      {childArray.map((child, index) => (
        <div
          key={index}
          ref={(node) => {
            itemRefs.current[index] = node;
          }}
          className={cn("min-w-0", itemClassName)}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
