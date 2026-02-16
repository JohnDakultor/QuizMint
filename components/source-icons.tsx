"use client";

import React from "react";
import { useState } from "react";

export type SourceIcon = {
  url: string;
  title?: string;
  iconUrl?: string;
};

interface SourceIconsProps {
  sources: SourceIcon[];
  size?: number;
  maxCount?: number;
  className?: string;
  variant?: "icons" | "compact" | "pills";
  showTooltips?: boolean;
}

function getHostname(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, "");
  } catch {
    return rawUrl;
  }
}

function getFaviconUrl(rawUrl: string, size = 32): string {
  try {
    const hostname = new URL(rawUrl).hostname;
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=${size}`;
  } catch {
    return "";
  }
}

export function SourceIcons({
  sources,
  size = 28,
  maxCount = 6,
  className,
  variant = "icons",
  showTooltips = true,
}: SourceIconsProps) {
  if (!sources?.length) return null;

  const [expanded, setExpanded] = useState(false);
  const isCompact = variant === "compact";
  const isPills = variant === "pills";
  const iconSize = Math.max(isCompact ? size - 6 : size, 18);
  const imgSize = Math.max(iconSize - (isPills ? 10 : 8), 12);

  const limit = Math.max(maxCount, 1);
  const visible = expanded ? sources : sources.slice(0, limit);
  const hiddenCount = Math.max(sources.length - visible.length, 0);

  return (
    <div className={className} aria-label="Sources">
      <div
        className={
          isPills
            ? "flex flex-wrap gap-2 max-w-full items-start sm:items-center sm:flex-row flex-col"
            : "flex items-center gap-2 max-w-full"
        }
        role="list"
        aria-label="Source icons"
      >
        {visible.map((s, i) => {
          const label = s.title || getHostname(s.url) || `Source ${i + 1}`;
          const favicon = s.iconUrl || getFaviconUrl(s.url, Math.max(size, 16));
          return (
            <a
              key={`${s.url}-${i}`}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className={
                isPills
                  ? "inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-sm text-black/80 hover:bg-black/5 max-w-full"
                  : "inline-flex items-center"
              }
              title={showTooltips ? label : undefined}
              aria-label={label}
              role="listitem"
            >
              <span
                className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white shrink-0"
                style={{ width: iconSize, height: iconSize }}
              >
                {favicon ? (
                  <img
                    src={favicon}
                    alt=""
                    width={imgSize}
                    height={imgSize}
                    className="block object-contain"
                  />
                ) : (
                  <span className="text-xs text-black/60">
                    {label.charAt(0).toUpperCase()}
                  </span>
                )}
              </span>
              {isPills ? (
                <span className="whitespace-nowrap truncate max-w-[140px]">
                  {label}
                </span>
              ) : null}
            </a>
          );
        })}

        {hiddenCount > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white text-xs text-black/60 px-2 py-1 hover:bg-black/5"
            aria-label={`${hiddenCount} more sources`}
            title={`${hiddenCount} more sources`}
          >
            +{hiddenCount} more
          </button>
        ) : null}
        {expanded && sources.length > limit ? (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white text-xs text-black/60 px-2 py-1 hover:bg-black/5"
            aria-label="Show fewer sources"
            title="Show fewer sources"
          >
            Show less
          </button>
        ) : null}
      </div>
    </div>
  );
}
