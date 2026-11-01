import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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

export const BookReader: React.FC<BookReaderProps> = ({
  userEmail,
  isSideBySide = false
}) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Modo de visualización: 'interactive' (Canvas con paso de página) vs 'continuous' (Iframe sin barras)
  const [displayMode, setDisplayMode] = useState<'interactive' | 'continuous'>('interactive');
  const [useWebEngine, setUseWebEngine] = useState(false);

  // Estados del visor interactivo Canvas
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isRenderingPage, setIsRenderingPage] = useState(false);
  const [zoomScale, setZoomScale] = useState(1.0);
  const [pageFlipClass, setPageFlipClass] = useState<string>('');

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const touchStartXRef = useRef<number | null>(null);
  const renderTaskRef = useRef<any>(null);

  // Cargar URL del libro digital desde Firebase Storage
  const loadPdf = async () => {
    setIsLoadingPdf(true);
    setPdfError(null);

    try {
      const result = await getDigitalBookPdfUrl();
      if (result.url) {
        setPdfUrl(result.url);
      } else {
        setPdfError('No se pudo encontrar el libro digital en el servidor.');
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

  // Inicializar PDF.js cuando pdfUrl esté disponible
  useEffect(() => {
    if (!pdfUrl) return;

    let isCancelled = false;

    const initPdfJs = async () => {
      if (!window.pdfjsLib) {
        // Si la librería CDN aún está cargando, esperar brevemente
        let retries = 0;
        while (!window.pdfjsLib && retries < 15) {
          await new Promise(r => setTimeout(r, 200));
          retries++;
        }
      }

      if (!window.pdfjsLib) {
        // Fallback al visor iframe si pdfjsLib no está disponible en el entorno
        setDisplayMode('continuous');
        return;
      }

      try {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        const loadingTask = window.pdfjsLib.getDocument({
          url: pdfUrl,
          withCredentials: false
        });

        const doc = await loadingTask.promise;
        if (!isCancelled) {
          setPdfDoc(doc);
          setTotalPages(doc.numPages || 1);
        }
      } catch (err: any) {
        console.info('[Lector] Motor interactivo usando visor adaptado continuo:', err?.message || err);
        if (!isCancelled) {
          // Si PDF.js no puede hacer fetch directo por políticas del navegador, activar modo continuo
          setDisplayMode('continuous');
        }
      }
    };

    initPdfJs();

    return () => {
      isCancelled = true;
    };
  }, [pdfUrl]);

  // Renderizar la página actual en el canvas
  const renderCurrentPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc || !canvasRef.current) return;

    setIsRenderingPage(true);

    try {
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // Ignorar cancelación de renderizado anterior
        }
      }

      const page = await pdfDoc.getPage(pageNum);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const context = canvas.getContext('2d');
      if (!context) return;

      // Calcular escala adaptativa para móviles, tablets y computadoras
      const baseViewport = page.getViewport({ scale: 1.0 });
      const containerWidth = containerRef.current 
        ? containerRef.current.clientWidth - (window.innerWidth < 640 ? 24 : 48)
        : window.innerWidth - 32;

      // Escala ajustada al ancho disponible multiplicada por el zoom del usuario
      const calculatedScale = Math.min(2.5, Math.max(0.6, (containerWidth / baseViewport.width) * zoomScale));
      const viewport = page.getViewport({ scale: calculatedScale });

      // Soporte Retina / Alta Densidad de Píxeles (HiDPI)
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
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
        console.warn('[Lector] Aviso de renderizado en página:', err);
      }
    } finally {
      setIsRenderingPage(false);
    }
  }, [pdfDoc, zoomScale]);

  useEffect(() => {
    if (pdfDoc && displayMode === 'interactive') {
      renderCurrentPage(currentPage);
    }
  }, [pdfDoc, currentPage, zoomScale, displayMode, renderCurrentPage]);

  // Navegación con efecto de paso de página (Ojear)
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setPageFlipClass('animate-page-flip-next');
      setTimeout(() => {
        setCurrentPage(p => p + 1);
        setPageFlipClass('');
      }, 200);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setPageFlipClass('animate-page-flip-prev');
      setTimeout(() => {
        setCurrentPage(p => p - 1);
        setPageFlipClass('');
      }, 200);
    }
  };

  // Manejo de gestos táctiles en celulares y tablets (Deslizar para ojear)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchEndX - touchStartXRef.current;

    // Umbral de 45px para cambiar de página
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

  // Bloqueo de atajos de teclado y navegación con flechas
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P' || e.key === 's' || e.key === 'S')) {
        e.preventDefault();
      }
      if (e.key === 'ArrowRight') {
        goToNextPage();
      } else if (e.key === 'ArrowLeft') {
        goToPrevPage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages]);

  // URL del visor adaptado en modo continuo
  const continuousPdfSrc = useMemo(() => {
    if (!pdfUrl) return '';
    if (useWebEngine) {
      return `https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true`;
    }
    return `${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`;
  }, [pdfUrl, useWebEngine]);

  return (
    <div 
      ref={containerRef}
      className={`w-full ${isSideBySide ? 'max-w-none px-0 py-0' : 'max-w-5xl mx-auto px-2 sm:px-4 md:px-6 py-2 sm:py-4'} flex-1 flex flex-col select-none`}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* BARRA SUPERIOR: RESPONSIVA PARA CELULARES, TABLETS Y ESCRITORIO */}
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
          
          {/* Alternar Modo: Libro Interactivo vs Visor Continuo */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200 text-[11px] font-bold">
            <button
              onClick={() => setDisplayMode('interactive')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition ${
                displayMode === 'interactive'
                  ? 'bg-white text-[#7c3aed] shadow-xs font-black'
                  : 'text-slate-600 hover:text-[#0f2147]'
              }`}
              title="Lectura con efecto de paso de página optimizada para táctil"
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
              title="Visor continuo de páginas"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Continuo</span>
            </button>
          </div>

          {/* Botón Zoom en modo Interactivo */}
          {displayMode === 'interactive' && (
            <div className="hidden md:flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
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
                title="Restablecer tamaño"
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
          )}

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

      {/* ÁREA PRINCIPAL: VISOR DEL LIBRO DIGITAL */}
      <div 
        className="w-full flex-1 flex flex-col rounded-2xl sm:rounded-3xl overflow-hidden glass-card shadow-xl relative border border-white/80 bg-slate-50"
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
              Preparando las páginas para tu lectura.
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
            {/* Contenedor central de la página del libro con efecto visual */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-100/70">
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

                {/* Canvas de renderizado de alta fidelidad */}
                <canvas 
                  ref={canvasRef} 
                  className="block mx-auto max-w-full h-auto select-none"
                />

                {/* Sombra de lomo central para dar sensación de libro real */}
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

              {/* Indicador de Página Central y Deslizador Rápido */}
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-xs font-mono font-black text-[#0f2147] bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                  {currentPage} <span className="text-slate-400 font-normal">/</span> {totalPages}
                </span>

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
          /* MODO 2: VISOR CONTINUO CON PARÁMETROS PROTEGIDOS                */
          /* ================================================================ */
          <div className="flex-1 flex flex-col relative w-full h-full min-h-[550px] bg-white">
            <iframe
              src={continuousPdfSrc}
              title="Libro Digital Oficial — 101 Buenos Malos Consejos"
              className="w-full flex-1 border-0 select-none bg-white block"
              style={{
                height: isFullscreen ? 'calc(100vh - 120px)' : 'calc(80vh - 56px)',
                minHeight: '520px',
                width: '100%'
              }}
            />

            {/* Barra inferior del modo continuo */}
            <div className="p-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Edición oficial &bull; Lector: <span className="text-[#7c3aed] font-bold">{userEmail}</span></span>
              </div>

              <div className="flex items-center gap-3 ml-auto">
                <button
                  type="button"
                  onClick={() => setUseWebEngine(prev => !prev)}
                  className="text-[11px] font-bold text-[#7c3aed] hover:underline transition"
                  title="Cambiar motor si tu navegador muestra pantalla oscura"
                >
                  {useWebEngine ? 'Usar Visor Directo' : '¿Pantalla oscura? Cambiar motor'}
                </button>

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
