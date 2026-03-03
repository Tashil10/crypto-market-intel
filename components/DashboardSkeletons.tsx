export default function DashboardSkeletons() {
  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-6">
        <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-zinc-800/80 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-6">
        <div className="h-4 w-28 bg-zinc-800 rounded animate-pulse" />
        <div className="mt-4 overflow-hidden">
          <div className="h-8 bg-zinc-800 rounded animate-pulse mb-2" />
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex gap-4 py-3 border-b border-zinc-800/50">
              <div className="h-4 w-12 bg-zinc-800 rounded animate-pulse" />
              <div className="h-4 w-16 bg-zinc-800 rounded animate-pulse" />
              <div className="h-4 w-14 bg-zinc-800 rounded animate-pulse" />
              <div className="h-4 w-14 bg-zinc-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-6">
        <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse mb-4" />
        <div className="h-64 bg-zinc-800/80 rounded animate-pulse flex items-end justify-around px-2 pb-8 gap-1">
          {[40, 65, 45, 80, 55, 70, 50].map((h, i) => (
            <div key={i} className="flex-1 bg-zinc-700 rounded-t" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
