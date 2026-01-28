import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { hapticActions } from '../../utils/haptics';

interface SwipeToDeleteProps {
    children: React.ReactNode;
    onDelete: () => void;
    threshold?: number;
    deleteLabel?: string;
    disabled?: boolean;
}

/**
 * SwipeToDelete - Swipe left to reveal delete action
 */
export const SwipeToDelete: React.FC<SwipeToDeleteProps> = ({
    children,
    onDelete,
    threshold = 100,
    deleteLabel = 'Excluir',
    disabled = false
}) => {
    const [isDeleting, setIsDeleting] = useState(false);
    const x = useMotionValue(0);
    const opacity = useTransform(x, [-threshold, 0], [1, 0]);
    const scale = useTransform(x, [-threshold, -threshold / 2], [1, 0.8]);

    const handleDragEnd = (_: any, info: PanInfo) => {
        if (info.offset.x < -threshold && !disabled) {
            hapticActions.warning();
            setIsDeleting(true);
            setTimeout(() => {
                onDelete();
            }, 200);
        }
    };

    if (disabled) {
        return <>{children}</>;
    }

    return (
        <div className="relative overflow-hidden">
            {/* Delete Background */}
            <motion.div
                className="absolute inset-y-0 right-0 flex items-center justify-end pr-4 bg-red-600"
                style={{ opacity }}
            >
                <motion.div
                    className="flex items-center gap-2 text-white font-bold"
                    style={{ scale }}
                >
                    <i className="fas fa-trash-alt"></i>
                    <span>{deleteLabel}</span>
                </motion.div>
            </motion.div>

            {/* Swipeable Content */}
            <motion.div
                drag="x"
                dragConstraints={{ left: -threshold * 1.5, right: 0 }}
                dragElastic={{ left: 0.1, right: 0 }}
                onDragEnd={handleDragEnd}
                style={{ x }}
                animate={isDeleting ? { x: -500, opacity: 0 } : {}}
                transition={{ type: 'spring', damping: 20 }}
                className="relative bg-inherit cursor-grab active:cursor-grabbing"
            >
                {children}
            </motion.div>
        </div>
    );
};

interface SwipeToActionProps {
    children: React.ReactNode;
    leftAction?: {
        icon: string;
        label: string;
        color: string;
        onAction: () => void;
    };
    rightAction?: {
        icon: string;
        label: string;
        color: string;
        onAction: () => void;
    };
    threshold?: number;
}

/**
 * SwipeToAction - Swipe left or right to reveal actions
 */
export const SwipeToAction: React.FC<SwipeToActionProps> = ({
    children,
    leftAction,
    rightAction,
    threshold = 80
}) => {
    const x = useMotionValue(0);
    const leftOpacity = useTransform(x, [0, threshold], [0, 1]);
    const rightOpacity = useTransform(x, [-threshold, 0], [1, 0]);

    const handleDragEnd = (_: any, info: PanInfo) => {
        if (info.offset.x > threshold && leftAction) {
            hapticActions.tap();
            leftAction.onAction();
        } else if (info.offset.x < -threshold && rightAction) {
            hapticActions.tap();
            rightAction.onAction();
        }
    };

    return (
        <div className="relative overflow-hidden">
            {/* Left Action Background */}
            {leftAction && (
                <motion.div
                    className="absolute inset-y-0 left-0 flex items-center pl-4"
                    style={{
                        opacity: leftOpacity,
                        backgroundColor: leftAction.color
                    }}
                >
                    <div className="flex items-center gap-2 text-white font-bold">
                        <i className={leftAction.icon}></i>
                        <span className="text-sm">{leftAction.label}</span>
                    </div>
                </motion.div>
            )}

            {/* Right Action Background */}
            {rightAction && (
                <motion.div
                    className="absolute inset-y-0 right-0 flex items-center justify-end pr-4"
                    style={{
                        opacity: rightOpacity,
                        backgroundColor: rightAction.color
                    }}
                >
                    <div className="flex items-center gap-2 text-white font-bold">
                        <span className="text-sm">{rightAction.label}</span>
                        <i className={rightAction.icon}></i>
                    </div>
                </motion.div>
            )}

            {/* Swipeable Content */}
            <motion.div
                drag="x"
                dragConstraints={{
                    left: rightAction ? -threshold * 1.5 : 0,
                    right: leftAction ? threshold * 1.5 : 0
                }}
                dragElastic={0.1}
                onDragEnd={handleDragEnd}
                style={{ x }}
                className="relative bg-inherit cursor-grab active:cursor-grabbing"
            >
                {children}
            </motion.div>
        </div>
    );
};

interface LongPressMenuProps {
    children: React.ReactNode;
    menuItems: Array<{
        icon: string;
        label: string;
        onClick: () => void;
        variant?: 'default' | 'danger';
    }>;
    disabled?: boolean;
}

/**
 * LongPressMenu - Long press to show context menu
 */
export const LongPressMenu: React.FC<LongPressMenuProps> = ({
    children,
    menuItems,
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        if (disabled) return;

        const touch = e.touches[0];
        timerRef.current = setTimeout(() => {
            hapticActions.impact();
            setPosition({ x: touch.clientX, y: touch.clientY });
            setIsOpen(true);
        }, 500);
    };

    const handleTouchEnd = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    };

    const handleTouchMove = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    };

    const handleItemClick = (onClick: () => void) => {
        hapticActions.select();
        onClick();
        setIsOpen(false);
    };

    return (
        <>
            <div
                ref={containerRef}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchMove}
                onContextMenu={(e) => {
                    if (!disabled) {
                        e.preventDefault();
                        setPosition({ x: e.clientX, y: e.clientY });
                        setIsOpen(true);
                    }
                }}
            >
                {children}
            </div>

            {/* Context Menu */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-[9998]"
                        onClick={() => setIsOpen(false)}
                        onTouchStart={() => setIsOpen(false)}
                    />

                    {/* Menu */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="fixed z-[9999] bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden min-w-[180px]"
                        style={{
                            left: Math.min(position.x, window.innerWidth - 200),
                            top: Math.min(position.y, window.innerHeight - (menuItems.length * 44 + 16))
                        }}
                    >
                        {menuItems.map((item, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleItemClick(item.onClick)}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors ${item.variant === 'danger'
                                        ? 'text-red-400 hover:bg-red-500/10'
                                        : 'text-slate-200 hover:bg-white/5'
                                    }`}
                            >
                                <i className={`${item.icon} w-4`}></i>
                                {item.label}
                            </button>
                        ))}
                    </motion.div>
                </>
            )}
        </>
    );
};

interface PinchToZoomProps {
    children: React.ReactNode;
    minScale?: number;
    maxScale?: number;
}

/**
 * PinchToZoom - Pinch to zoom content
 */
export const PinchToZoom: React.FC<PinchToZoomProps> = ({
    children,
    minScale = 1,
    maxScale = 3
}) => {
    const [scale, setScale] = useState(1);
    const initialDistance = useRef<number | null>(null);

    const getDistance = (e: React.TouchEvent) => {
        const [t1, t2] = [e.touches[0], e.touches[1]];
        return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            initialDistance.current = getDistance(e);
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 2 && initialDistance.current) {
            const currentDistance = getDistance(e);
            const newScale = (currentDistance / initialDistance.current) * scale;
            setScale(Math.min(maxScale, Math.max(minScale, newScale)));
        }
    };

    const handleTouchEnd = () => {
        initialDistance.current = null;
    };

    const resetZoom = () => {
        setScale(1);
        hapticActions.tap();
    };

    return (
        <div
            className="touch-none overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onDoubleClick={resetZoom}
        >
            <motion.div
                style={{ scale }}
                transition={{ type: 'spring', damping: 20 }}
            >
                {children}
            </motion.div>
        </div>
    );
};

export default {
    SwipeToDelete,
    SwipeToAction,
    LongPressMenu,
    PinchToZoom
};
