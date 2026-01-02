import React from 'react';
import Skeleton from '../ui/Skeleton';

const LessonSkeleton: React.FC = () => {
    return (
        <div className="flex flex-col lg:flex-row h-screen bg-slate-50 dark:bg-slate-950">
            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6">
                {/* Video Player Skeleton */}
                <div className="max-w-5xl mx-auto">
                    <Skeleton height="h-[400px] lg:h-[500px]" rounded="rounded-2xl" />
                </div>

                {/* Content Skeleton */}
                <div className="max-w-3xl mx-auto space-y-4 bg-white dark:bg-slate-900 rounded-2xl p-6">
                    {/* Title */}
                    <Skeleton height="h-8" width="w-3/4" rounded="rounded-lg" />

                    {/* Content Lines */}
                    <div className="space-y-3 mt-6">
                        <Skeleton height="h-4" width="w-full" />
                        <Skeleton height="h-4" width="w-full" />
                        <Skeleton height="h-4" width="w-11/12" />
                        <Skeleton height="h-4" width="w-full" />
                        <Skeleton height="h-4" width="w-10/12" />
                    </div>

                    <div className="space-y-3 mt-6">
                        <Skeleton height="h-4" width="w-full" />
                        <Skeleton height="h-4" width="w-full" />
                        <Skeleton height="h-4" width="w-9/12" />
                    </div>
                </div>
            </div>

            {/* Sidebar Skeleton (Desktop only) */}
            <div className="hidden lg:block w-80 xl:w-96 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
                {/* Sidebar Header */}
                <Skeleton height="h-6" width="w-32" rounded="rounded-lg" />

                {/* Sidebar Items */}
                {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="flex items-center gap-3">
                        <Skeleton height="h-10" width="w-10" rounded="rounded-lg" />
                        <div className="flex-1 space-y-2">
                            <Skeleton height="h-4" width="w-full" />
                            <Skeleton height="h-3" width="w-2/3" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LessonSkeleton;
