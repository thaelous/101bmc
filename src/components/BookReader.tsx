import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { 
  Maximize2, 
  Minimize2, 
  BookOpen, 
  Bookmark, 
  BookmarkCheck,
  ChevronLeft, 
  ChevronRight, 
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Check
} from 'lucide-react';
import { saveBookmarkedPage, getBookmarkedPage } from '../firebase/config';

// Configurar el worker de PDF.js usando el archivo estático local sin dependencias de red
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
}

interface BookReaderProps {
  userEmail: string;
  isSideBySide?: boolean;
}

export const BookReader: React.FC<BookReaderProps> = ({
  userEmail,
  isSideBySide = false
}) => {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLoadingDoc, setIsLoadingDoc] = useState<boolean>(true);
  const [isRenderingPage, setIsRenderingPage] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState<number>(223);
  const [zoomFactor, setZoomFactor] = useState<number>(1.0);

  // Estado del marcador (página guardada en Firestore / localStorage)
  const [bookmarkedPage, setBookmarkedPage] = useState<number | null>(() => {
    try {
      const savedBookmark = localStorage.getItem('bmc_pagina_marcada_libro');
      if (savedBookmark) {
        const p = parseInt(savedBookmark, 10);
        if (!isNaN(p) && p >= 1) return p;
      }
    } catch {}
    return null;
  });

  const [bookmarkToast, setBookmarkToast] = useState<string | null>(null);
  const [isSavingBookmark, setIsSavingBookmark] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const currentRenderTaskRef = useRef<RenderTask | null>(null);
  const touchStartXRef = useRef<number | null>(null);

  // Estado de la página actual guardada en localStorage
  const [currentPage, setCurrentPage] = useState<number>(() => {
    try {
      // Prioridad 1: Página marcada previamente por el usuario
      const savedBookmark = localStorage.getItem('bmc_pagina_marcada_libro');
      if (savedBookmark) {
        const p = parseInt(savedBookmark, 10);
        if (!isNaN(p) && p >= 1) return p;
      }
      // Prioridad 2: Última página leída
      const saved = localStorage.getItem('bmc_pagina_libro_actual');
      if (saved) {
        const p = parseInt(saved, 10);
        if (!isNaN(p) && p >= 1) return p;
      }
    } catch {}
    return 1;
  });

  const [pageInputValue, setPageInputValue] = useState<string>(() => currentPage.toString());

  const [downloadProgress, setDownloadProgress] = useState<number>(0);

  // Cargar el documento PDF mediante ArrayBuffer en el hilo principal
  // Esto elimina al 100% las peticiones de red del worker, evitando errores 500 y problemas de cookies
  useEffect(() => {
    let isMounted = true;
    let activeTask: any = null;
    setIsLoadingDoc(true);
    setLoadError(null);
    setDownloadProgress(0);

    const loadPdfDirectly = async () => {
      try {
        // 1. Descargar el archivo binario optimizado para móviles /libro-movil.pdf
        let response = await fetch('/libro-movil.pdf');
        if (!response.ok) {
          response = await fetch('/101BMC.pdf');
        }
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Error al obtener archivo PDF`);
        }

        const contentLength = response.headers.get('content-length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;
        
        let buffer: ArrayBuffer;
        if (response.body && total > 0) {
          const reader = response.body.getReader();
          const chunks: Uint8Array[] = [];
          let received = 0;
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              chunks.push(value);
              received += value.length;
              if (isMounted) {
                setDownloadProgress(Math.min(99, Math.round((received / total) * 100)));
              }
            }
          }
          const combined = new Uint8Array(received);
          let offset = 0;
          for (const chunk of chunks) {
            combined.set(chunk, offset);
            offset += chunk.length;
          }
          buffer = combined.buffer;
        } else {
          buffer = await response.arrayBuffer();
        }

        if (!isMounted) return;
        setDownloadProgress(100);

        // 2. Inicializar PDF.js directamente con los bytes en memoria (data)
        // El worker recibe los datos por postMessage, eliminando cualquier petición de red en el worker
        const task = pdfjsLib.getDocument({
          data: new Uint8Array(buffer),
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
          cMapPacked: true
        });
        activeTask = task;
        const pdf = await task.promise;
        if (!isMounted) return;
        pdfDocRef.current = pdf;
        setTotalPages(pdf.numPages);
        setIsLoadingDoc(false);
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Error al inicializar PDF:', err);
        setLoadError('No se pudo cargar el libro digital. Por favor pulsa en Reintentar.');
        setIsLoadingDoc(false);
      }
    };

    loadPdfDirectly();

    return () => {
      isMounted = false;
      try {
        activeTask?.destroy?.();
      } catch {}
    };
  }, []);

  // Función para renderizar la página en el canvas
  const renderCurrentPage = useCallback(async () => {
    const pdf = pdfDocRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!pdf || !canvas || !container) return;

    try {
      setIsRenderingPage(true);

      // Cancelar cualquier renderizado anterior en curso
      if (currentRenderTaskRef.current) {
        currentRenderTaskRef.current.cancel();
        currentRenderTaskRef.current = null;
      }

      const page = await pdf.getPage(currentPage);
      const baseViewport = page.getViewport({ scale: 1.0 });

      // Obtener ancho y alto disponibles en el contenedor
      const containerWidth = Math.max(container.clientWidth - 32, 280);
      const containerHeight = Math.max(container.clientHeight - 40, 420);

      // Escalar para que encaje de manera óptima y legible
      const scaleFitWidth = containerWidth / baseViewport.width;
      const scaleFitHeight = containerHeight / baseViewport.height;

      // En móviles preferimos ajuste al ancho, en pantallas grandes ajuste proporcional
      const isMobile = window.innerWidth < 768;
      let calculatedScale = isMobile 
        ? scaleFitWidth * zoomFactor 
        : Math.min(scaleFitWidth, scaleFitHeight) * zoomFactor;

      // Garantizar un mínimo legible
      if (calculatedScale < 0.6) calculatedScale = 0.6;

      const dpr = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: calculatedScale * dpr });

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
      canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport
      };

      const renderTask = page.render(renderContext);
      currentRenderTaskRef.current = renderTask;

      await renderTask.promise;
      setIsRenderingPage(false);
      currentRenderTaskRef.current = null;
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error('Error renderizando página:', err);
      }
      setIsRenderingPage(false);
    }
  }, [currentPage, zoomFactor]);

  // Renderizar al cambiar página, zoom o al terminar de cargar
  useEffect(() => {
    if (!isLoadingDoc && pdfDocRef.current) {
      renderCurrentPage();
    }
  }, [isLoadingDoc, currentPage, zoomFactor, renderCurrentPage]);

  // Reajustar al redimensionar ventana
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        renderCurrentPage();
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, [renderCurrentPage]);

  // Sincronizar input con currentPage
  useEffect(() => {
    setPageInputValue(currentPage.toString());
  }, [currentPage]);

  // Alternar pantalla completa
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Navegación de páginas
  const goToPage = (target: number) => {
    const valid = Math.max(1, Math.min(totalPages, target));
    setCurrentPage(valid);
    setPageInputValue(valid.toString());
    try {
      localStorage.setItem('bmc_pagina_libro_actual', valid.toString());
    } catch {}
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  };

  const handlePageJump = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const target = parseInt(pageInputValue.trim(), 10);
    if (!isNaN(target)) {
      goToPage(target);
    } else {
      setPageInputValue(currentPage.toString());
    }
  };

  // Consultar la última página marcada en Firestore / localStorage al iniciar
  useEffect(() => {
    if (!userEmail) return;
    let isMounted = true;
    getBookmarkedPage(userEmail).then((savedBookmark) => {
      if (!isMounted) return;
      if (savedBookmark && savedBookmark >= 1 && savedBookmark <= totalPages) {
        setBookmarkedPage(savedBookmark);
        // Si no había interacción previa en esta sesión, abrir en el marcador
        const hasSessionPage = localStorage.getItem('bmc_pagina_libro_actual');
        if (!hasSessionPage) {
          goToPage(savedBookmark);
        }
      }
    }).catch((err) => {
      console.warn('[BookReader] Consulta marcador inicial:', err);
    });
    return () => { isMounted = false; };
  }, [userEmail, totalPages]);

  // Guardar página actual como marcador (favorito) en Firestore y localStorage
  const handleBookmarkCurrentPage = async () => {
    const pageToBookmark = currentPage;
    setIsSavingBookmark(true);
    setBookmarkedPage(pageToBookmark);

    try {
      await saveBookmarkedPage(userEmail, pageToBookmark);
    } catch (err) {
      console.warn('Error guardando marcador:', err);
    }

    // Confirmación visual (Toast)
    setBookmarkToast(`Marcador guardado en la página ${pageToBookmark}`);
    
    setTimeout(() => {
      setIsSavingBookmark(false);
    }, 400);

    setTimeout(() => {
      setBookmarkToast(null);
    }, 2800);
  };

  // Controles de zoom
  const zoomIn = () => setZoomFactor(prev => Math.min(prev + 0.15, 2.0));
  const zoomOut = () => setZoomFactor(prev => Math.max(prev - 0.15, 0.7));
  const resetZoom = () => setZoomFactor(1.0);

  // Atajos de teclado (← y → para hojear)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevPage();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextPage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages]);

  // Gestos táctiles (Swipe izquierdo/derecho en móvil)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchEndX - touchStartXRef.current;
    touchStartXRef.current = null;

    // Umbral de 50px para detectar deslizamiento
    if (diffX > 50) {
      handlePrevPage(); // Deslizar hacia la derecha -> página anterior
    } else if (diffX < -50) {
      handleNextPage(); // Deslizar hacia la izquierda -> página siguiente
    }
  };

  const isCurrentPageBookmarked = bookmarkedPage === currentPage;

  return (
    <div 
      ref={containerRef}
      className={`w-full ${isSideBySide ? 'max-w-none px-0 py-0' : 'max-w-5xl mx-auto px-2 sm:px-4 md:px-6 py-1 sm:py-2'} flex-1 flex flex-col select-none pb-20 sm:pb-24 relative`}
    >
      {/* Toast sutil de confirmación del marcador guardado */}
      {bookmarkToast && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-neutral-900/95 text-white shadow-2xl border border-amber-400/50 backdrop-blur-md text-xs font-bold transition-all animate-bounce-short">
          <BookmarkCheck className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span>{bookmarkToast}</span>
        </div>
      )}

      {/* 2. PARTE SUPERIOR: ÚNICAMENTE ICONO DE SEPARADOR VISUAL Y PANTALLA COMPLETA */}
      <div className="glass-card rounded-2xl px-3 sm:px-4 py-2.5 mb-2.5 shadow-sm flex items-center justify-between border border-slate-200/90 bg-white/95 backdrop-blur-md">
        
        {/* Título de la obra */}
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <h2 className="font-heading text-xs sm:text-sm font-black text-neutral-900 uppercase tracking-tight truncate">
            101 buenos malos consejos para mi hijo
          </h2>
        </div>

        {/* Iconos superiores minimalistas y elegantes */}
        <div className="flex items-center gap-2">
          {/* Zoom rápido opcional y sutil */}
          <div className="hidden sm:flex items-center gap-1 bg-neutral-100/80 rounded-xl p-0.5 border border-neutral-200/80">
            <button
              type="button"
              onClick={zoomOut}
              className="p-1.5 rounded-lg hover:bg-white text-neutral-600 hover:text-neutral-900 transition"
              title="Reducir zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={resetZoom}
              className="px-1.5 py-1 text-[11px] font-bold text-neutral-700 hover:bg-white rounded-lg transition"
              title="Restablecer zoom"
            >
              {Math.round(zoomFactor * 100)}%
            </button>
            <button
              type="button"
              onClick={zoomIn}
              className="p-1.5 rounded-lg hover:bg-white text-neutral-600 hover:text-neutral-900 transition"
              title="Aumentar zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Botón de separador / marcador interactivo con confirmación visual */}
          <button
            type="button"
            onClick={handleBookmarkCurrentPage}
            className={`relative p-2 rounded-xl transition-all shadow-2xs flex items-center justify-center cursor-pointer active:scale-95 ${
              isCurrentPageBookmarked
                ? 'bg-amber-500 text-white border border-amber-600 ring-2 ring-amber-400/40 shadow-sm'
                : 'bg-amber-50 hover:bg-amber-100/90 text-amber-800 border border-amber-200/80 hover:border-amber-300'
            }`}
            title={
              isCurrentPageBookmarked
                ? `Esta página (${currentPage}) está marcada en tu separador`
                : `Guardar página ${currentPage} como marcador`
            }
            aria-label="Guardar marcador de página"
          >
            {isCurrentPageBookmarked ? (
              <BookmarkCheck className={`w-4 h-4 text-white fill-white ${isSavingBookmark ? 'scale-125' : ''} transition-transform`} />
            ) : (
              <Bookmark className={`w-4 h-4 text-amber-600 fill-amber-500/80 ${isSavingBookmark ? 'scale-125' : ''} transition-transform`} />
            )}
            {bookmarkedPage !== null && (
              <span 
                className={`absolute -bottom-1 -right-1 text-[9px] font-black px-1 rounded-full border leading-tight ${
                  isCurrentPageBookmarked
                    ? 'bg-white text-amber-800 border-amber-600'
                    : 'bg-amber-800 text-white border-white'
                }`}
                title={`Marcador guardado en pág. ${bookmarkedPage}`}
              >
                {bookmarkedPage}
              </span>
            )}
          </button>

          {/* Icono minimalista de pantalla completa */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white transition shadow-2xs cursor-pointer flex items-center justify-center active:scale-95"
            title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
            aria-label="Pantalla completa"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 text-amber-400" />
            ) : (
              <Maximize2 className="w-4 h-4 text-amber-400" />
            )}
          </button>
        </div>
      </div>

      {/* 3. VISOR NATIVO DE PDF PROPIO: RENDERIZACIÓN DIRECTA EN CANVAS SIN EXTERNOS */}
      <div 
        className="w-full flex-1 flex flex-col items-center justify-center rounded-2xl sm:rounded-3xl overflow-auto shadow-xl relative border-2 border-slate-300/80 bg-neutral-800/90 ring-1 ring-black/10 group p-2 sm:p-4"
        style={{ 
          minHeight: isFullscreen ? 'calc(100vh - 120px)' : '620px',
          height: isFullscreen ? 'calc(100vh - 120px)' : '78vh'
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onContextMenu={(e) => e.preventDefault()} // Ocultar menú contextual de guardado
      >
        {/* Botón flotante lateral izquierdo para hojear hacia atrás */}
        <button
          type="button"
          onClick={handlePrevPage}
          disabled={currentPage <= 1}
          className={`absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 p-2.5 sm:p-3 rounded-full bg-neutral-900/85 hover:bg-neutral-900 text-white backdrop-blur-md shadow-xl border border-white/20 transition-all cursor-pointer ${
            currentPage <= 1 ? 'opacity-0 pointer-events-none' : 'opacity-70 hover:opacity-100 hover:scale-105 active:scale-95'
          }`}
          title="Página anterior (←)"
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
        </button>

        {/* Botón flotante lateral derecho para hojear hacia adelante */}
        <button
          type="button"
          onClick={handleNextPage}
          disabled={currentPage >= totalPages}
          className={`absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 p-2.5 sm:p-3 rounded-full bg-neutral-900/85 hover:bg-neutral-900 text-white backdrop-blur-md shadow-xl border border-white/20 transition-all cursor-pointer ${
            currentPage >= totalPages ? 'opacity-0 pointer-events-none' : 'opacity-70 hover:opacity-100 hover:scale-105 active:scale-95'
          }`}
          title="Página siguiente (→)"
          aria-label="Página siguiente"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
        </button>

        {/* Indicador de carga inicial del documento con barra de progreso */}
        {isLoadingDoc && (
          <div className="flex flex-col items-center justify-center p-8 text-center text-white max-w-xs w-full">
            <Loader2 className="w-10 h-10 text-amber-400 animate-spin mb-3" />
            <h3 className="font-heading text-base font-bold text-white mb-1">
              Cargando libro digital...
            </h3>
            <p className="text-xs text-neutral-300 font-medium mb-3">
              {downloadProgress > 0 && downloadProgress < 100 
                ? `Descargando páginas: ${downloadProgress}%` 
                : 'Preparando visor de alta resolución...'}
            </p>
            {downloadProgress > 0 && downloadProgress < 100 && (
              <div className="w-full bg-neutral-700/80 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-amber-400 h-full rounded-full transition-all duration-200"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Mensaje de error si falla la carga */}
        {loadError && (
          <div className="p-6 text-center text-red-300 bg-red-950/60 rounded-2xl border border-red-800 max-w-md">
            <p className="text-sm font-bold mb-2">{loadError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-white text-neutral-900 rounded-xl text-xs font-bold hover:bg-neutral-100 transition shadow"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* CANVAS DE ALTA RESOLUCIÓN */}
        <div className="relative flex items-center justify-center overflow-visible">
          <canvas 
            ref={canvasRef} 
            className={`rounded-lg sm:rounded-xl shadow-2xl transition-opacity duration-150 bg-white ${
              isLoadingDoc || isRenderingPage ? 'opacity-85' : 'opacity-100'
            }`}
          />
          {isRenderingPage && (
            <div className="absolute top-3 right-3 bg-neutral-900/80 backdrop-blur-xs text-amber-400 px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-md">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Cambiando página...</span>
            </div>
          )}
        </div>
      </div>

      {/* 4. BARRA INFERIOR FIJA: NAVEGACIÓN Y SALTO DE PÁGINA INSTANTÁNEO */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] py-2.5 px-4"
        aria-label="Controles de lectura"
      >
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          {/* Botón Retroceder de página */}
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={currentPage <= 1 || isLoadingDoc}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition shadow-2xs ${
              currentPage <= 1 || isLoadingDoc
                ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200' 
                : 'bg-neutral-900 hover:bg-neutral-800 text-white cursor-pointer active:scale-95'
            }`}
            title="Página anterior (←)"
          >
            <ChevronLeft className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Anterior</span>
          </button>

          {/* Pequeño recuadro de entrada de texto (input numérico) con Enter para saltar */}
          <form 
            onSubmit={handlePageJump} 
            className="flex items-center gap-1.5 bg-neutral-100 border border-neutral-300/80 rounded-xl px-2.5 py-1 shadow-inner"
          >
            <label htmlFor="page-jump-input" className="text-xs font-semibold text-neutral-600 select-none">
              Pág.
            </label>
            <input
              id="page-jump-input"
              type="number"
              min={1}
              max={totalPages}
              value={pageInputValue}
              onChange={(e) => setPageInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handlePageJump();
                }
              }}
              className="w-12 sm:w-14 text-center font-bold text-xs sm:text-sm text-neutral-900 bg-white border border-neutral-300 rounded-lg py-0.5 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
              placeholder="1"
              title="Escribe el número de página y presiona Enter"
            />
            <span className="text-xs text-neutral-500 font-semibold select-none">
              de {totalPages}
            </span>
            <button
              type="submit"
              className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-[11px] font-bold transition cursor-pointer shadow-2xs active:scale-95"
              title="Saltar a esta página (Enter)"
            >
              Ir
            </button>
          </form>

          {/* Botón Avanzar de página */}
          <button
            type="button"
            onClick={handleNextPage}
            disabled={currentPage >= totalPages || isLoadingDoc}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition shadow-2xs ${
              currentPage >= totalPages || isLoadingDoc
                ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200'
                : 'bg-neutral-900 hover:bg-neutral-800 text-white cursor-pointer active:scale-95'
            }`}
            title="Página siguiente (→)"
          >
            <span className="hidden sm:inline">Siguiente</span>
            <ChevronRight className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      </nav>
    </div>
  );
};


