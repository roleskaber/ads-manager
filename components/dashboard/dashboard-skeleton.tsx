export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white lg:block" />
      <div className="lg:pl-64">
        <div className="h-20 border-b border-slate-200 bg-white" />
        <div className="mx-auto max-w-[1500px] animate-pulse px-5 py-7 sm:px-8">
          <div className="h-9 w-64 rounded-lg bg-slate-200/70" />
          <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-36 rounded-xl bg-white" />)}
          </div>
          <div className="mt-6 h-80 rounded-xl bg-white" />
        </div>
      </div>
    </div>
  );
}
