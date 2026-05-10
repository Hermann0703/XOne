import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

function SkeletonDashboard() {
  return (
    <div className="flex h-full">
      {/* 左侧主内容骨架 */}
      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-card border border-border bg-bg-card p-4">
              <div className="flex items-start justify-between">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
              <Skeleton className="mt-3 h-8 w-20" />
              <Skeleton className="mt-1 h-4 w-16" />
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-9 rounded-lg" />
          ))}
        </div>
        <div className="rounded-card border border-border bg-bg-card p-4">
          <Skeleton className="mb-4 h-6 w-24" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="mb-3 h-14 w-full rounded-lg" />
          ))}
        </div>
      </div>
      {/* 右侧面板骨架 */}
      <div className="w-80 shrink-0 border-l border-border bg-bg-card px-4 py-6">
        <Skeleton className="mb-4 h-5 w-20" />
        <Skeleton className="mx-auto mb-3 h-28 w-28 rounded-full" />
        <Skeleton className="mb-6 h-5 w-20" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </div>
  );
}

const PersonalDashboard = dynamic(() => import('@/plugins/personal/dashboard/PersonalDashboard'), {
  loading: () => <SkeletonDashboard />,
});

export default function PersonalDashboardPage() {
  return <PersonalDashboard />;
}
