import React from 'react';
import Skeleton from '../ui/Skeleton';

interface DashboardSkeletonProps {
    count?: number;
}

const DashboardSkeleton: React.FC<DashboardSkeletonProps> = ({ count = 6 }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: count }).map((_, index) => (
                <div
                    key={index}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                >
                    {/* Image Skeleton */}
                    <Skeleton height="h-48" rounded="rounded-none" />

                    {/* Content */}
                    <div className="p-6 space-y-4">
                        {/* Title */}
                        <Skeleton height="h-6" width="w-3/4" rounded="rounded-lg" />

                        {/* Description */}
                        <div className="space-y-2">
                            <Skeleton height="h-4" width="w-full" rounded="rounded" />
                            <Skeleton height="h-4" width="w-5/6" rounded="rounded" />
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4">
                            <Skeleton height="h-3" width="w-20" rounded="rounded" />
                            <Skeleton height="h-3" width="w-20" rounded="rounded" />
                        </div>

                        {/* Button */}
                        <Skeleton height="h-12" width="w-full" rounded="rounded-xl" />
                    </div>
                </div>
            ))}
        </div>
    );
};

export default DashboardSkeleton;
