function Block({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl border border-slate-200 bg-white ${className}`} />;
}

export function MembersSkeleton() {
  return (
    <div className="space-y-6">
      <Block className="h-80" />
      <Block className="h-40" />
    </div>
  );
}

export function InviteFormSkeleton() {
  return <Block className="h-80" />;
}
