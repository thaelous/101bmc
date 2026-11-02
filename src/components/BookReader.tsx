import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Maximize2, 
  Minimize2, 
  ShieldCheck, 
  AlertCircle, 
  Loader2, 
  BookOpen, 
  CheckCircle2, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Layers, 
  BookMarked 
} from 'lucide-react';
import { getDigitalBookPdfUrl } from '../firebase/config';

interface BookReaderProps {
  userEmail: string;
  isSideBySide?: boolean;
}

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

/**
 * Componente de página individual para el Modo Continuo.
 * Utiliza IntersectionObserver para renderizar el lienzo <canvas> mediante PDF.js
 * de manera suave y diferida a medida que el usuario hace scroll vertical.
 */
interface ContinuousPageItemProps {
  pdfDoc: any;
  pageNum: number;
  zoomScale: number;
  containerWidth: number;
  onPageVisible?: (pageNum: number) => void;
}

const ContinuousPageItem: React.FC<ContinuousPageItemProps> = ({
  pdfDoc,
  pageNum,
  zoomScale,
  containerWidth,
  onPageVisible
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isRendered, setIsRendered] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(1.414);
  const renderTaskRef = useRef<any>(null);

  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;
    setIsRendering(true);

    try {
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // Ignorar cancelación previa
        }
      }

      const page = await pdfDoc.getPage(pageNum);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const baseViewport = page.getViewport({ scale: 1.0 });
      const currentRatio = baseViewport.height / baseViewport.width;
      setAspectRatio(currentRatio);

      // Calcular ancho disponible respetando el zoom del usuario
      const targetWidth = Math.min(containerWidth - 24, 850);
      const calculatedScale = Math.min(2.5, Math.max(0.55, (targetWidth / baseViewport.width) * zoomScale));
      const viewport = page.getViewport({ scale: calculatedScale });

      // Escala de píxeles nítida en pantallas Retina y móviles
      const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const renderContext = {
        canvasContext: ctx,
        viewport
      };

      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;
      await renderTask.promise;
      setIsRendered(true);
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.warn(`[Lector Continuo] Error renderizado pág ${pageNum}:`, err);
      }
    } finally {
      setIsRendering(false);
    }
  }, [pdfDoc, pageNum, zoomScale, containerWidth]);

  useEffect(() => {
    let observer: IntersectionObserver | null = null;
    const el = wrapperRef.current;

    if (el) {
      observer = new IntersectionObserver((entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          if (!isRendered) {
            renderPage();
          }
          if (entry.intersectionRatio > 0.45 && onPageVisible) {
            onPageVisible(pageNum);
          }
        }
      }, {
        rootMargin: '500px 0px',
        threshold: [0, 0.5, 1.0]
      });

      observer.observe(el);
    }

    return () => {
      if (observer && el) observer.unobserve(el);
    };
  }, [pdfDoc, pageNum, renderPage, isRendered, onPageVisible]);

  useEffect(() => {
    if (isRendered) {
      renderPage();
    }
  }, [zoomScale, containerWidth, renderPage]);

  return (
    <div 
      ref={wrapperRef}
      id={`continuous-page-${pageNum}`}
      className="relative mx-auto my-4 bg-white shadow-xl rounded-xl sm:rounded-2xl overflow-hidden border border-slate-200/80 transition-all select-none"
      style={{
        maxWidth: `${Math.min(containerWidth - 24, 850)}px`,
        minHeight: `${Math.round(Math.min(containerWidth - 24, 850) * aspectRatio)}px`
      }}
    >
      <canvas ref={canvasRef} className="block mx-auto max-w-full h-auto select-none pointer-events-none" />

      {/* Indicador de carga si aún no se ha renderizado */}
      {!isRendered && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-[#7c3aed] mb-2" />
          <span className="text-xs font-semibold">Cargando página {pageNum}...</span>
        </div>
      )}

      {/* Número de página discreto */}
      <div className="absolute bottom-2 right-3 text-[10px] font-mono font-bold text-slate-400 bg-white/90 border border-slate-200/80 px-2 py-0.5 rounded shadow-2xs">
        {pageNum}
      </div>
    </div>
  );
};

export const BookReader: React.FC<BookReaderProps> = ({
  userEmail,
  isSideBySide = false
}) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Modos de visualización: 'interactive' (Ojear página por página) vs 'continuous' (Scroll vertical continuo)
  const [displayMode, setDisplayMode] = useState<'interactive' | 'continuous'>('interactive');

  // Estados del documento cargado mediante Mozilla PDF.js
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isRenderingPage, setIsRenderingPage] = useState(false);
  const [zoomScale, setZoomScale] = useState(1.0);
  const [pageFlipClass, setPageFlipClass] = useState<string>('');

  // Última posición de lectura guardada automáticamente en localStorage
  const [currentPage, setCurrentPage] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('bmc_ultima_pagina_lectura');
      if (saved) {
        const p = parseInt(saved, 10);
        if (!isNaN(p) && p > 0) return p;
      }
    } catch {}
    return 1;
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const continuousContainerRef = useRef<HTMLDivElement>(null);
  const touchStartXRef = useRef<number | null>(null);
  const renderTaskRef = useRef<any>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  // Actualizar ancho del contenedor para respuesta fluida
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Guardar automáticamente la posición de lectura en localStorage
  useEffect(() => {
    if (currentPage > 0) {
      try {
        localStorage.setItem('bmc_ultima_pagina_lectura', currentPage.toString());
      } catch (err) {
        console.warn('[BookReader] Error al guardar posición de lectura:', err);
      }
    }
  }, [currentPage]);

  // Cargar URL del archivo 101BMC.pdf desde Firebase Storage
  const loadPdf = async () => {
    setIsLoadingPdf(true);
    setPdfError(null);

    try {
      const result = await getDigitalBookPdfUrl();
      if (result.url) {
        setPdfUrl(result.url);
      } else {
        setPdfError('No se pudo encontrar el libro digital en el servidor oficial.');
      }
    } catch {
      setPdfError('Error de conexión al cargar el libro digital. Por favor, reintenta.');
    } finally {
      setIsLoadingPdf(false);
    }
  };

  useEffect(() => {
    loadPdf();
  }, []);

  // Inicializar Mozilla PDF.js oficial e instanciar el documento con ArrayBuffer
  useEffect(() => {
    if (!pdfUrl) return;

    let isCancelled = false;

    const initPdfJs = async () => {
      setIsLoadingPdf(true);
      setPdfError(null);

      try {
        // 1. Asegurar que pdfjsLib esté disponible en window
        if (!window.pdfjsLib) {
          await new Promise<void>((resolve, reject) => {
            let retries = 0;
            const interval = setInterval(() => {
              if (window.pdfjsLib) {
                clearInterval(interval);
                resolve();
              } else if (retries > 25) {
                clearInterval(interval);
                // Inyectar dinámicamente si tardó el CDN
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
                script.onload = () => resolve();
                script.onerror = () => reject(new Error('No se pudo cargar la librería PDF.js'));
                document.head.appendChild(script);
              }
              retries++;
            }, 150);
          });
        }

        // 2. Configurar el worker oficial de Mozilla PDF.js
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        // 3. Descargar el archivo 101BMC.pdf en memoria como ArrayBuffer
        // Esto evita bloqueos de CORS del worker o errores de Google Docs
        const response = await fetch(pdfUrl);
        if (!response.ok) {
          throw new Error(`Error HTTP ${response.status} al descargar el libro`);
        }
        const arrayBuffer = await response.arrayBuffer();

        if (isCancelled) return;

        // 4. Instanciar el documento directamente con el ArrayBuffer
        const loadingTask = window.pdfjsLib.getDocument({
          data: arrayBuffer,
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
          cMapPacked: true
        });

        const doc = await loadingTask.promise;
        if (!isCancelled) {
          setPdfDoc(doc);
          const max = doc.numPages || 1;
          setTotalPages(max);

          // Asegurar que la página guardada esté acotada
          setCurrentPage(prev => (prev > max ? max : prev < 1 ? 1 : prev));
          setIsLoadingPdf(false);
        }
      } catch (err: any) {
        console.error('[BookReader] Error al inicializar PDF.js:', err);
        if (!isCancelled) {
          setPdfError('No se pudo abrir el libro digital con el motor de lectura. Por favor, reintenta.');
          setIsLoadingPdf(false);
        }
      }
    };

    initPdfJs();

    return () => {
      isCancelled = true;
    };
  }, [pdfUrl]);

  // Renderizar la página actual en el modo "Ojear" (página individual en Canvas)
  const renderInteractivePage = useCallback(async (pageNum: number) => {
    if (!pdfDoc || !canvasRef.current) return;

    setIsRenderingPage(true);

    try {
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // Ignorar cancelación
        }
      }

      const page = await pdfDoc.getPage(pageNum);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const context = canvas.getContext('2d');
      if (!context) return;

      const baseViewport = page.getViewport({ scale: 1.0 });
      const availableWidth = containerRef.current 
        ? containerRef.current.clientWidth - (window.innerWidth < 640 ? 24 : 48)
        : window.innerWidth - 32;

      const targetWidth = Math.min(availableWidth, 900);
      const calculatedScale = Math.min(2.5, Math.max(0.6, (targetWidth / baseViewport.width) * zoomScale));
      const viewport = page.getViewport({ scale: calculatedScale });

      // Soporte Retina / Pantallas HiDPI
      const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const renderContext = {
        canvasContext: context,
        viewport
      };

      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;
      await renderTask.promise;
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.warn('[BookReader] Aviso de renderizado:', err);
      }
    } finally {
      setIsRenderingPage(false);
    }
  }, [pdfDoc, zoomScale]);

  useEffect(() => {
    if (pdfDoc && displayMode === 'interactive') {
      renderInteractivePage(currentPage);
    }
  }, [pdfDoc, currentPage, zoomScale, displayMode, renderInteractivePage]);

  // Navegación con efecto de paso de página (Ojear)
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setPageFlipClass('animate-page-flip-next');
      setTimeout(() => {
        setCurrentPage(p => p + 1);
        setPageFlipClass('');
      }, 180);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setPageFlipClass('animate-page-flip-prev');
      setTimeout(() => {
        setCurrentPage(p => p - 1);
        setPageFlipClass('');
      }, 180);
    }
  };

  // Manejo de gestos táctiles (Swipe)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchEndX - touchStartXRef.current;

    if (diffX < -45) {
      goToNextPage();
    } else if (diffX > 45) {
      goToPrevPage();
    }
    touchStartXRef.current = null;
  };

  // Controles de zoom
  const handleZoomIn = () => setZoomScale(z => Math.min(z + 0.15, 2.0));
  const handleZoomOut = () => setZoomScale(z => Math.max(z - 0.15, 0.75));
  const handleResetZoom = () => setZoomScale(1.0);

  // Control de pantalla completa
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {});
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Bloqueo de atajos de teclado para guardar/imprimir y navegación con flechas
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P' || e.key === 's' || e.key === 'S')) {
        e.preventDefault();
      }
      if (displayMode === 'interactive') {
        if (e.key === 'ArrowRight') {
          goToNextPage();
        } else if (e.key === 'ArrowLeft') {
          goToPrevPage();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, displayMode]);

  // Al cambiar al modo continuo, desplazar suavemente a la página actual
  useEffect(() => {
    if (displayMode === 'continuous' && continuousContainerRef.current) {
      const pageEl = document.getElementById(`continuous-page-${currentPage}`);
      if (pageEl) {
        pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [displayMode]);

  return (
    <div 
      ref={containerRef}
      className={`w-full ${isSideBySide ? 'max-w-none px-0 py-0' : 'max-w-5xl mx-auto px-2 sm:px-4 md:px-6 py-2 sm:py-4'} flex-1 flex flex-col select-none`}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* BARRA SUPERIOR: RESPONSIVA */}
      <div className="glass-card rounded-2xl p-3 sm:p-4 mb-3 sm:mb-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        
        {/* Identidad del Libro */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-tr from-[#7c3aed] to-[#4f96fe] text-white shadow-md flex-shrink-0">
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="overflow-hidden">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="font-heading text-xs sm:text-sm md:text-base font-black text-[#0f2147] uppercase tracking-tight truncate">
                101 BUENOS MALOS CONSEJOS
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase flex-shrink-0">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>Oficial</span>
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
              Libro Digital &bull; Por Robert Pacheco
            </p>
          </div>
        </div>

        {/* Controles de visualización y modo de lectura */}
        <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 flex-wrap">
          
          {/* Alternar Modo: Ojear (Canvas interactivo) vs Continuo (Scroll vertical fluido) */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200 text-[11px] font-bold">
            <button
              onClick={() => setDisplayMode('interactive')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition ${
                displayMode === 'interactive'
                  ? 'bg-white text-[#7c3aed] shadow-xs font-black'
                  : 'text-slate-600 hover:text-[#0f2147]'
              }`}
              title="Lectura página por página optimizada para táctil"
            >
              <BookMarked className="w-3.5 h-3.5" />
              <span>Ojear</span>
            </button>

            <button
              onClick={() => setDisplayMode('continuous')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition ${
                displayMode === 'continuous'
                  ? 'bg-white text-[#7c3aed] shadow-xs font-black'
                  : 'text-slate-600 hover:text-[#0f2147]'
              }`}
              title="Lectura continua con scroll vertical suave"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Continuo</span>
            </button>
          </div>

          {/* Controles de Zoom */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
            <button 
              onClick={handleZoomOut} 
              className="p-1.5 rounded-lg hover:bg-white text-slate-600 transition" 
              title="Reducir zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={handleResetZoom} 
              className="px-1.5 text-[11px] font-mono font-bold text-slate-700 hover:text-[#7c3aed]" 
              title="Restablecer tamaño (100%)"
            >
              {Math.round(zoomScale * 100)}%
            </button>
            <button 
              onClick={handleZoomIn} 
              className="p-1.5 rounded-lg hover:bg-white text-slate-600 transition" 
              title="Aumentar zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Recargar */}
          <button
            onClick={loadPdf}
            className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 transition shadow-xs"
            title="Recargar libro"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPdf ? 'animate-spin text-[#7c3aed]' : ''}`} />
          </button>

          {/* Pantalla Completa */}
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1 p-2 sm:px-3 sm:py-2 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-bold shadow-md shadow-[#7c3aed]/30 transition"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{isFullscreen ? 'Salir' : 'Pantalla'}</span>
          </button>
        </div>

      </div>

      {/* ÁREA PRINCIPAL: VISOR OFICIAL 100% CANVAS CON MOZILLA PDF.JS */}
      <div 
        className="w-full flex-1 flex flex-col rounded-2xl sm:rounded-3xl overflow-hidden glass-card shadow-xl relative border border-white/80 bg-slate-100"
        style={{ minHeight: isFullscreen ? 'calc(100vh - 80px)' : 'calc(80vh - 30px)' }}
      >
        
        {isLoadingPdf ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white/70 min-h-[500px]">
            <div className="w-12 h-12 rounded-full p-2 bg-[#7c3aed]/10 flex items-center justify-center mb-3">
              <Loader2 className="w-6 h-6 text-[#7c3aed] animate-spin" />
            </div>
            <h3 className="font-heading text-base sm:text-lg font-black text-[#0f2147] mb-1">
              Abriendo tu libro digital...
            </h3>
            <p className="text-xs text-slate-500 max-w-xs">
              Renderizando las páginas en alta resolución con el motor oficial.
            </p>
          </div>
        ) : pdfError ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white/80 min-h-[500px]">
            <div className="w-12 h-12 rounded-full p-2 bg-red-100 flex items-center justify-center mb-3 text-red-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="font-heading text-base sm:text-lg font-black text-[#0f2147] mb-1">
              No se pudo abrir el libro digital
            </h3>
            <p className="text-xs text-slate-600 max-w-sm mb-4 leading-relaxed">
              Comprueba tu conexión o intenta recargar nuevamente.
            </p>
            <button
              onClick={loadPdf}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7c3aed] text-white text-xs font-black uppercase tracking-wider shadow-md hover:bg-[#6d28d9] transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reintentar</span>
            </button>
          </div>
        ) : displayMode === 'interactive' && pdfDoc ? (
          /* ================================================================ */
          /* MODO 1: CANVAS INTERACTIVO CON EFECTO DE PASO DE PÁGINA (OJEAR)  */
          /* ================================================================ */
          <div 
            className="flex-1 flex flex-col relative w-full h-full overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Contenedor central de la página */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-100/80">
              <div 
                className={`relative bg-white shadow-2xl rounded-xl sm:rounded-2xl overflow-hidden transition-all duration-300 border border-slate-200/80 ${pageFlipClass}`}
                style={{
                  boxShadow: '0 20px 40px -15px rgba(15, 33, 71, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.04)'
                }}
              >
                {/* Indicador de carga de renderizado suave */}
                {isRenderingPage && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-xs flex items-center justify-center z-10">
                    <Loader2 className="w-6 h-6 text-[#7c3aed] animate-spin" />
                  </div>
                )}

                {/* Canvas de renderizado nativo */}
                <canvas 
                  ref={canvasRef} 
                  className="block mx-auto max-w-full h-auto select-none pointer-events-none"
                />

                {/* Sombra de lomo central para sensación de libro real */}
                <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/10 to-transparent pointer-events-none" />
              </div>
            </div>

            {/* BARRA INFERIOR DE NAVEGACIÓN Y PASO DE PÁGINA */}
            <div className="p-3 sm:p-3.5 bg-white border-t border-slate-200 flex items-center justify-between gap-2 shadow-sm z-20">
              {/* Botón Página Anterior */}
              <button
                onClick={goToPrevPage}
                disabled={currentPage <= 1 || isRenderingPage}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-slate-100 hover:bg-[#7c3aed] hover:text-white text-[#0f2147] text-xs font-black transition disabled:opacity-30 disabled:pointer-events-none active:scale-95 shadow-xs"
                title="Página anterior (o desliza a la derecha)"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Anterior</span>
              </button>

              {/* Indicador de Página Central */}
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-xs font-mono font-black text-[#0f2147] bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                  {currentPage} <span className="text-slate-400 font-normal">/</span> {totalPages}
                </span>

                {currentPage > 1 && (
                  <span 
                    className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-[#7c3aed] bg-[#7c3aed]/10 px-2 py-1 rounded-lg"
                    title="Tu avance de lectura se guarda automáticamente en este dispositivo"
                  >
                    <BookMarked className="w-3 h-3" />
                    <span>Guardado</span>
                  </span>
                )}

                <span className="hidden md:inline text-[11px] text-slate-400 font-medium italic">
                  (Desliza para ojear)
                </span>
              </div>

              {/* Botón Página Siguiente */}
              <button
                onClick={goToNextPage}
                disabled={currentPage >= totalPages || isRenderingPage}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-black transition disabled:opacity-30 disabled:pointer-events-none active:scale-95 shadow-md shadow-[#7c3aed]/25"
                title="Página siguiente (o desliza a la izquierda)"
              >
                <span className="hidden sm:inline">Siguiente</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* ================================================================ */
          /* MODO 2: SCROLL CONTINUO 100% CANVAS CON MOZILLA PDF.JS          */
          /* ================================================================ */
          <div className="flex-1 flex flex-col relative w-full h-full bg-slate-100">
            {/* Contenedor vertical scrollable con todas las páginas */}
            <div 
              ref={continuousContainerRef}
              className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-6 space-y-4"
              style={{
                height: isFullscreen ? 'calc(100vh - 120px)' : 'calc(80vh - 56px)'
              }}
            >
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <ContinuousPageItem
                  key={pageNum}
                  pdfDoc={pdfDoc}
                  pageNum={pageNum}
                  zoomScale={zoomScale}
                  containerWidth={containerWidth}
                  onPageVisible={(visiblePage) => {
                    setCurrentPage(visiblePage);
                  }}
                />
              ))}
            </div>

            {/* Barra inferior del modo continuo */}
            <div className="p-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2 z-20 shadow-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Edición oficial &bull; Lector: <span className="text-[#7c3aed] font-bold">{userEmail}</span></span>
              </div>

              <div className="flex items-center gap-3 ml-auto">
                <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                  Página {currentPage} de {totalPages}
                </span>

                <div className="flex items-center gap-1 text-slate-500 font-semibold text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Protegido</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
