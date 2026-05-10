import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

function SkeletonDashboard() {
  return (
    <div className="flex h-full flex-col">
      {/* Header skeleton */}
      <div className="space-y-1 border-b border-border px-6 pb-4 pt-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      {/* 主内容 + 右侧面板骨架 */}
      <div className="flex flex-1">
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {/* Stat cards skeleton */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-card border border-border bg-bg-card p-5">
                <Skeleton className="mb-3 h-10 w-10 rounded-lg" />
                <Skeleton className="mb-1 h-7 w-20" />
                <Skeleton className="h-4 w-14" />
              </div>
            ))}
          </div>
          {/* Project overview skeleton */}
          <div className="rounded-card border border-border bg-bg-card p-4">
            <Skeleton className="mb-4 h-5 w-32" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="mb-2 h-10 w-full" />
            ))}
          </div>
          {/* Recent activity skeleton */}
          <div className="rounded-card border border-border bg-bg-card p-4">
            <Skeleton className="mb-4 h-5 w-24" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="mb-2 h-9 w-full" />
            ))}
          </div>
        </div>
        {/* 右侧面板骨架 */}
        <div className="w-80 shrink-0 border-l border-border bg-bg-card p-4">
          <Skeleton className="mb-4 h-5 w-20" />
          <Skeleton className="mx-auto mb-4 h-28 w-28 rounded-full" />
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="mt-6 mb-4 h-5 w-20" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    </div>
  );
}

const WorkDashboard = dynamic(() => import('@/plugins/work/dashboard/WorkDashboard'), {
  loading: () => <SkeletonDashboard />,
});

export default function WorkDashboardPage() {
  return <WorkDashboard />;
}
