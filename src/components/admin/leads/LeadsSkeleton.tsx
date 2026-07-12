import { Skeleton } from '../../ui/skeleton';
import { Surface } from './ui';

export function LeadsContentSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <Surface className="p-4">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-5 w-64" />
          <div className="flex items-center gap-1.5">
            <Skeleton className="w-7 h-7 rounded-md" />
            <Skeleton className="w-7 h-7 rounded-md" />
          </div>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} className="flex-1 min-w-0 h-[70px] rounded-lg" />
          ))}
        </div>
      </Surface>
      <div>
        <Skeleton className="h-4 w-28 mb-2" />
        <Surface>
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t border-border' : ''}`}
            >
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-3 w-64" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </Surface>
      </div>
    </div>
  );
}
