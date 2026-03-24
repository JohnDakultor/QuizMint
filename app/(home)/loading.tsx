export default function HomeLoading() {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      <div className="animate-pulse space-y-6">
        <div className="h-32 rounded-3xl bg-linear-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="h-80 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-80 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    </div>
  );
}
