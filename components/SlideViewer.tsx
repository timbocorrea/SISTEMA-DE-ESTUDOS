import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SlideViewerProps {
    title: string;
    slides?: string[];
    fileUrl?: string;
    fileType?: 'pdf' | 'pptx';
    onClose?: () => void;
}

const SlideViewer: React.FC<SlideViewerProps> = ({ title, slides = [], fileUrl, fileType, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [direction, setDirection] = useState(0);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const renderTaskRef = React.useRef<any>(null);

    // PDF State
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [numPages, setNumPages] = useState(0);
    const [pdfError, setPdfError] = useState<string | null>(null);
    const [pdfLoading, setPdfLoading] = useState(false);

    const isFileMode = !!fileUrl;
    // If PDF, use pdf pages. If Image slides, use array length.
    const totalSlides = isFileMode && fileType === 'pdf' ? numPages : slides.length;

    // --- PDF Loading Logic ---
    useEffect(() => {
        if (!fileUrl || fileType !== 'pdf') return;

        let isMounted = true;
        setPdfLoading(true);
        setPdfError(null);

        const loadPdf = async () => {
            try {
                // Dynamically import PDF.js
                const pdfjsLib = await import('pdfjs-dist');
                // Configure worker
                // Use unpkg to ensure we get the correct version matches the installed package
                // and use .mjs for proper ESM loading which is required by pdfjs-dist v4+
                pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

                // Handle Dropbox CORS issues by converting www.dropbox.com to dl.dropboxusercontent.com
                let corsFriendlyUrl = fileUrl;
                if (fileUrl?.includes('dropbox.com')) {
                    corsFriendlyUrl = fileUrl
                        .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
                        .replace('dropbox.com', 'dl.dropboxusercontent.com')
                        .replace('&raw=1', '')
                        .replace('dl=0', '');

                    if (!corsFriendlyUrl.includes('raw=1')) {
                        // Sometimes helps to ensure raw is properly set or append if not present in dropboxusercontent
                        // actually dropboxusercontent doesn't need raw=1, it parses directly.
                    }
                }

                // Load Document
                const loadingTask = pdfjsLib.getDocument(corsFriendlyUrl);
                const pdf = await loadingTask.promise;

                if (!isMounted) return;

                setPdfDoc(pdf);
                setNumPages(pdf.numPages);
                setCurrentIndex(0); // Reset to first page
            } catch (err: any) {
                console.error("Error loading PDF:", err);
                if (isMounted) setPdfError("Não foi possível carregar o PDF. Verifique se o link é público.");
            } finally {
                if (isMounted) setPdfLoading(false);
            }
        };

        loadPdf();

        return () => { isMounted = false; };
    }, [fileUrl, fileType]);

    // --- PDF Rendering Logic ---
    const renderPage = useCallback(async (pageNum: number) => {
        if (!pdfDoc || !canvasRef.current) return;

        // Cancel previous render if any
        if (renderTaskRef.current) {
            renderTaskRef.current.cancel();
        }

        try {
            const page = await pdfDoc.getPage(pageNum + 1); // PDF pages are 1-based
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            if (!context) return;

            // Calculate scale to fit container width/height while maintaining aspect ratio
            const container = containerRef.current;
            const containerWidth = container ? container.clientWidth : 800;
            const containerHeight = container ? container.clientHeight : 600;

            // Base viewport at scale 1
            const viewport = page.getViewport({ scale: 1 });

            // Determine best scale (fit width or height)
            const scaleX = containerWidth / viewport.width;
            const scaleY = containerHeight / viewport.height;
            const scale = Math.min(scaleX, scaleY) * 1.5; // Slight boost for sharpness (Retina)

            const scaledViewport = page.getViewport({ scale });

            canvas.height = scaledViewport.height;
            canvas.width = scaledViewport.width;

            const renderContext = {
                canvasContext: context,
                viewport: scaledViewport,
            };

            const renderTask = page.render(renderContext);
            renderTaskRef.current = renderTask;

            await renderTask.promise;
        } catch (err: any) {
            if (err.name !== 'RenderingCancelledException') {
                console.error("Page render error:", err);
            }
        }
    }, [pdfDoc]);

    // Re-render when index changes or resize
    useEffect(() => {
        if (fileType === 'pdf' && pdfDoc) {
            renderPage(currentIndex);
        }
    }, [currentIndex, fileType, pdfDoc, renderPage, isFullscreen]);

    // Handle Window Resize for PDF
    useEffect(() => {
        if (fileType !== 'pdf') return;
        const handleResize = () => {
            // Debounce slightly or just call render
            if (pdfDoc) renderPage(currentIndex);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [pdfDoc, currentIndex, renderPage, fileType]);


    // --- Navigation Logic ---
    const goToSlide = useCallback((index: number) => {
        if (index < 0 || index >= totalSlides) return;
        setDirection(index > currentIndex ? 1 : -1);
        setCurrentIndex(index);
    }, [currentIndex, totalSlides]);

    const goNext = useCallback(() => {
        if (currentIndex < totalSlides - 1) {
            setDirection(1);
            setCurrentIndex(prev => prev + 1);
        }
    }, [currentIndex, totalSlides]);

    const goPrev = useCallback(() => {
        if (currentIndex > 0) {
            setDirection(-1);
            setCurrentIndex(prev => prev - 1);
        }
    }, [currentIndex]);

    const toggleFullscreen = useCallback(async () => {
        if (!containerRef.current) return;

        if (!document.fullscreenElement) {
            await containerRef.current.requestFullscreen();
            setIsFullscreen(true);
        } else {
            await document.exitFullscreen();
            setIsFullscreen(false);
        }
    }, []);

    // Keyboard navigation (Unify for all modes)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowRight':
                case 'ArrowDown':
                    e.preventDefault();
                    goNext();
                    break;
                case 'ArrowLeft':
                case 'ArrowUp':
                    e.preventDefault();
                    goPrev();
                    break;
                case 'Escape':
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                        setIsFullscreen(false);
                    }
                    break;
                case 'f':
                case 'F':
                    toggleFullscreen();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [goNext, goPrev, toggleFullscreen]);

    // Listen for fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // =========== RENDERERS ===========

    // PPTX Fallback
    if (isFileMode && fileType === 'pptx') {
        const encodedUrl = encodeURIComponent(fileUrl);
        const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;

        return (
            <div
                ref={containerRef}
                className={`relative w-full bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-700 group ${isFullscreen ? 'flex flex-col' : ''}`}
            >
                {/* Header PPTX */}
                <div className="flex items-center justify-between bg-slate-800 px-3 py-2 border-b border-slate-700">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-orange-500/20">
                            <i className="fas fa-file-powerpoint text-orange-400 text-xs"></i>
                        </div>
                        <span className="text-white text-xs font-bold truncate max-w-[250px]">{title}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">
                            PPTX
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white" title="Abrir em nova aba">
                            <i className="fas fa-external-link-alt text-[10px]"></i>
                        </a>
                        <button onClick={toggleFullscreen} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white" title="Tela Cheia">
                            <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'} text-[10px]`}></i>
                        </button>
                    </div>
                </div>
                <div className={`${isFullscreen ? 'flex-1' : 'aspect-[4/3]'} bg-slate-950`}>
                    <iframe src={viewerUrl} className="w-full h-full border-0" title={title} allowFullScreen sandbox="allow-scripts allow-same-origin allow-popups allow-forms" />
                </div>
            </div>
        );
    }

    // PDF Client-Side Renderer OR Image Slides
    return (
        <div
            ref={containerRef}
            className={`relative w-full bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-700 group flex flex-col ${isFullscreen ? 'h-full justify-center' : ''}`}
        >
            {/* Header (Unified) */}
            <div className={`absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300`}>
                <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${fileType === 'pdf' ? 'bg-red-500/20' : 'bg-amber-500/20'}`}>
                        <i className={`fas ${fileType === 'pdf' ? 'fa-file-pdf text-red-400' : 'fa-images text-amber-400'} text-xs`}></i>
                    </div>
                    <span className="text-white text-xs font-bold truncate max-w-[200px]">{title}</span>
                </div>
                <div className="flex items-center gap-2">
                    {/* Page Indicator */}
                    <span className="text-white/80 text-[10px] font-bold bg-black/40 px-2 py-1 rounded-md backdrop-blur-sm border border-white/10">
                        {totalSlides > 0 ? `${currentIndex + 1} / ${totalSlides}` : '0 / 0'}
                    </span>

                    {isFileMode && (
                        <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors" title="Download / Abrir">
                            <i className="fas fa-external-link-alt text-[10px]"></i>
                        </a>
                    )}

                    <button
                        onClick={toggleFullscreen}
                        className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                        title={isFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}
                    >
                        <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'} text-xs`}></i>
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className={`relative ${isFullscreen ? 'w-full flex-1' : 'aspect-[4/3]'} flex items-center justify-center bg-slate-950 overflow-hidden`}>

                {/* PDF Mode */}
                {fileType === 'pdf' && (
                    <>
                        {pdfLoading && (
                            <div className="flex flex-col items-center gap-3">
                                <i className="fas fa-spinner fa-spin text-red-500 text-2xl"></i>
                                <span className="text-slate-400 text-xs">Carregando PDF...</span>
                            </div>
                        )}

                        {pdfError && (
                            <div className="flex flex-col items-center gap-2 text-center p-4">
                                <i className="fas fa-exclamation-triangle text-amber-500 text-2xl"></i>
                                <p className="text-white text-sm font-bold">Erro ao exibir PDF</p>
                                <p className="text-slate-400 text-xs max-w-xs">{pdfError}</p>
                                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline">
                                    Abrir link original
                                </a>
                            </div>
                        )}

                        <canvas
                            ref={canvasRef}
                            className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${pdfLoading ? 'opacity-0' : 'opacity-100'}`}
                        />
                    </>
                )}

                {/* Slides (Images) Mode */}
                {!isFileMode && slides.length > 0 && (
                    <AnimatePresence initial={false} custom={direction} mode="wait">
                        <motion.img
                            key={currentIndex}
                            src={slides[currentIndex]}
                            alt={`Slide ${currentIndex + 1}`}
                            custom={direction}
                            initial={{ x: direction > 0 ? 300 : -300, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: direction > 0 ? -300 : 300, opacity: 0 }}
                            transition={{ x: { type: 'spring', stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
                            className={`${isFullscreen ? 'max-w-full max-h-full' : 'w-full h-full'} object-contain select-none`}
                            draggable={false}
                        />
                    </AnimatePresence>
                )}

                {(!isFileMode && slides.length === 0) && (
                    <div className="text-center text-slate-400">
                        <i className="fas fa-images text-4xl mb-3 opacity-30"></i>
                        <p className="text-sm font-medium">Nenhum slide disponível</p>
                    </div>
                )}


                {/* Navigation Arrows (Common) */}
                {totalSlides > 1 && (
                    <>
                        <button
                            onClick={goPrev}
                            disabled={currentIndex === 0}
                            className={`absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all backdrop-blur-sm ${currentIndex === 0 ? 'opacity-0 pointer-events-none' : 'bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 hover:scale-110'}`}
                        >
                            <i className="fas fa-chevron-left text-sm"></i>
                        </button>
                        <button
                            onClick={goNext}
                            disabled={currentIndex === totalSlides - 1}
                            className={`absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all backdrop-blur-sm ${currentIndex === totalSlides - 1 ? 'opacity-0 pointer-events-none' : 'bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 hover:scale-110'}`}
                        >
                            <i className="fas fa-chevron-right text-sm"></i>
                        </button>
                    </>
                )}
            </div>

            {/* Bottom Progress Bar (Common) */}
            <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-full h-1 bg-white/20 rounded-full mb-2 overflow-hidden cursor-pointer" onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const percent = clickX / rect.width;
                    const targetIndex = Math.floor(percent * totalSlides);
                    goToSlide(targetIndex);
                }}>
                    <motion.div
                        className={`h-full rounded-full ${fileType === 'pdf' ? 'bg-gradient-to-r from-red-500 to-rose-500' : 'bg-gradient-to-r from-amber-500 to-orange-500'}`}
                        initial={false}
                        animate={{ width: `${((currentIndex + 1) / totalSlides) * 100}%` }}
                        transition={{ duration: 0.1 }}
                    />
                </div>

                {/* PDF does not show dots usually due to high count, but showing navigation hint */}
                <div className="flex items-center justify-center gap-4 mt-1 text-[9px] text-white/50 font-medium">
                    <span><kbd className="px-1 py-0.5 bg-white/10 rounded text-[8px] font-mono">←</kbd> <kbd className="px-1 py-0.5 bg-white/10 rounded text-[8px] font-mono">→</kbd> Navegar</span>
                    {fileType === 'pdf' && <span><i className="fas fa-mouse-pointer mr-1"></i> Clique na barra para pular</span>}
                </div>
            </div>
        </div>
    );
};

export default SlideViewer;
