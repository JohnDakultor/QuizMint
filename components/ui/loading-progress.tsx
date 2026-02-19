import SkeletonLoading from "@/components/ui/skeleton-loading";

type LoadingProgressProps = {
  label: string;
  percent: number;
};

export default function LoadingProgress({ label, percent }: LoadingProgressProps) {
  const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className="w-full rounded-lg border border-zinc-200 bg-white/80 p-3">
      <div className="mb-2 flex items-center justify-between text-xs font-medium text-zinc-600">
        <span>{label}</span>
        <span>{safePercent}%</span>
      </div>
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-zinc-200">
        <div
          className="h-full rounded-full bg-linear-to-r from-blue-500 to-indigo-600 transition-all duration-300"
          style={{ width: `${safePercent}%` }}
        />
        <div className="pointer-events-none absolute inset-0">
          <SkeletonLoading className="h-full w-full bg-transparent" />
        </div>
      </div>
    </div>
  );
}

