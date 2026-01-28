import React from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';

interface MobileModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
    icon?: string;
    iconColor?: string;
    maxWidth?: string;
    showHandle?: boolean;
}

/**
 * MobileModal - Modal responsivo que se comporta como Bottom Sheet em mobile
 * 
 * Features:
 * - Desktop: Modal centralizado tradicional
 * - Mobile: Bottom Sheet com swipe para fechar
 * - Gesture support via Framer Motion
 * - Acessibilidade com touch targets de 44px+
 */
const MobileModal: React.FC<MobileModalProps> = ({
    isOpen,
    onClose,
    children,
    title,
    subtitle,
    icon,
    iconColor = 'text-indigo-400',
    maxWidth = 'max-w-lg',
    showHandle = true
}) => {
    const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        // Se arrastou mais de 100px para baixo, fecha o modal
        if (info.offset.y > 100) {
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{
                            opacity: 0,
                            y: typeof window !== 'undefined' && window.innerWidth < 768 ? '100%' : 20
                        }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{
                            opacity: 0,
                            y: typeof window !== 'undefined' && window.innerWidth < 768 ? '100%' : 20
                        }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0, bottom: 0.5 }}
                        onDragEnd={handleDragEnd}
                        className={`
                            relative z-10 w-full bg-[#0a0e14]/95 backdrop-blur-xl border border-white/10 shadow-2xl
                            
                            /* Mobile: Bottom Sheet */
                            max-md:rounded-t-3xl max-md:rounded-b-none
                            max-md:max-h-[90vh]
                            
                            /* Desktop: Centered Modal */
                            md:rounded-3xl md:mx-4 md:max-h-[85vh]
                            ${maxWidth}
                            
                            flex flex-col overflow-hidden
                        `}
                    >
                        {/* Drag Handle - Mobile Only */}
                        {showHandle && (
                            <div className="md:hidden flex justify-center py-3 cursor-grab active:cursor-grabbing">
                                <div className="w-12 h-1.5 bg-white/20 rounded-full" />
                            </div>
                        )}

                        {/* Header */}
                        {(title || icon) && (
                            <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-white/5 shrink-0">
                                <div className="flex items-center gap-3">
                                    {icon && (
                                        <div className={`w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center ${iconColor}`}>
                                            <i className={icon}></i>
                                        </div>
                                    )}
                                    <div>
                                        {title && <h3 className="text-lg font-black text-white">{title}</h3>}
                                        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="w-11 h-11 rounded-xl bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                                    aria-label="Fechar modal"
                                >
                                    <i className="fas fa-times text-lg"></i>
                                </button>
                            </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto overscroll-contain">
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default MobileModal;
