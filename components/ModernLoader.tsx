import React from 'react';

interface ModernLoaderProps {
    message?: string;
    size?: 'sm' | 'md' | 'lg';
    fullscreen?: boolean;
}

/**
 * Modern skeleton loader with smooth animations
 * Following frontend-design principles: purposeful animation, performance-focused
 */
export const ModernLoader: React.FC<ModernLoaderProps> = ({
    message = 'Carregando...',
    size = 'md',
    fullscreen = false
}) => {
    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-16 h-16'
    };

    const containerClasses = fullscreen
        ? 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/95 dark:bg-[#0a0e14]/95 backdrop-blur-sm'
        : 'flex flex-col items-center justify-center p-8';

    return (
        <div className={containerClasses}>
            {/* Animated spinner - using transform for performance */}
            <div className="relative">
                {/* Outer ring */}
                <div
                    className={`${sizeClasses[size]} rounded-full border-4 border-slate-200 dark:border-slate-800`}
                />
                {/* Spinning gradient ring */}
                <div
                    className={`
            ${sizeClasses[size]} 
            absolute inset-0 
            rounded-full 
            border-4 border-transparent 
            border-t-indigo-600 dark:border-t-indigo-400
            border-r-indigo-400 dark:border-r-indigo-500
            animate-spin
            shadow-lg shadow-indigo-500/20
          `}
                    style={{ animationDuration: '0.8s' }}
                />
                {/* Center dot pulse */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-pulse" />
                </div>
            </div>

            {/* Message with fade animation */}
            {message && (
                <p className="mt-6 text-sm font-medium text-slate-600 dark:text-slate-400 animate-pulse">
                    {message}
                </p>
            )}
        </div>
    );
};

/**
 * Skeleton loader for list items
 * Use while data is loading to show structure
 */
export const SkeletonLoader: React.FC<{ count?: number }> = ({ count = 3 }) => {
    return (
        <div className="space-y-3 p-4">
            {Array.from({ length: count }).map((_, index) => (
                <div
                    key={index}
                    className="animate-pulse flex gap-3"
                    style={{ animationDelay: `${index * 50}ms` }}
                >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800" />

                    {/* Content lines */}
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                    </div>
                </div>
            ))}
        </div>
    );
};
