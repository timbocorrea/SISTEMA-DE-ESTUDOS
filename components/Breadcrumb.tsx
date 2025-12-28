import React from 'react';

interface BreadcrumbItem {
    label: string;
    icon?: string;
    onClick?: () => void;
}

interface BreadcrumbProps {
    items: BreadcrumbItem[];
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
    if (items.length === 0) return null;

    return (
        <nav className="bg-[#e2e8f0] dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 px-8 py-4 backdrop-blur-sm sticky top-0 z-40">
            <div className="flex items-center gap-2 text-sm">
                {items.map((item, index) => (
                    <React.Fragment key={index}>
                        {/* Breadcrumb Item */}
                        {item.onClick ? (
                            <button
                                onClick={item.onClick}
                                className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium group"
                            >
                                {item.icon && <i className={`${item.icon} text-xs`}></i>}
                                <span className="group-hover:underline uppercase tracking-wider text-xs font-black">
                                    {item.label}
                                </span>
                            </button>
                        ) : (
                            <div className="flex items-center gap-2 text-slate-800 dark:text-white font-black">
                                {item.icon && <i className={`${item.icon} text-xs`}></i>}
                                <span className="uppercase tracking-wider text-xs">
                                    {item.label}
                                </span>
                            </div>
                        )}

                        {/* Separator */}
                        {index < items.length - 1 && (
                            <i className="fas fa-chevron-right text-[8px] text-slate-400 dark:text-slate-600 mx-1"></i>
                        )}
                    </React.Fragment>
                ))}
            </div>
        </nav>
    );
};

export default Breadcrumb;
