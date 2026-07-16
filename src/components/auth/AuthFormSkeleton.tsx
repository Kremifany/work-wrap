export function AuthFormSkeleton() {
  return (
    <div className="card-padded animate-pulse" aria-hidden="true">
      <div className="h-8 w-48 rounded bg-slate-200" />
      <div className="mt-2 h-4 w-full max-w-xs rounded bg-slate-100" />
      <div className="mt-6 h-11 w-full rounded-lg bg-slate-200" />
      <div className="my-5 border-t border-slate-200" />
      <div className="space-y-4">
        <div className="h-10 w-full rounded bg-slate-100" />
        <div className="h-10 w-full rounded bg-slate-100" />
        <div className="h-10 w-full rounded bg-slate-100" />
        <div className="h-10 w-full rounded bg-slate-100" />
        <div className="h-11 w-full rounded-lg bg-slate-200" />
      </div>
    </div>
  );
}
