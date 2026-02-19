import React from "react";

type SkeletonLoadingProps = {
  className?: string;
};

export default function SkeletonLoading({ className = "" }: SkeletonLoadingProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800 ${className}`.trim()}
      aria-hidden="true"
    />
  );
}

