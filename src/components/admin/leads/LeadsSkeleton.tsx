import { Skeleton } from '../../ui/skeleton';
import { Surface } from './ui';

export function LeadsContentSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <Surface className="p-4">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
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
