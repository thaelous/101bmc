import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { 
  Maximize2, 
  Minimize2, 
  Bookmark, 
  BookmarkCheck, 
  ChevronLeft, 
  ChevronRight, 
  Loader2 
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
  const touchStartYRef = useRef<number | null>(null);
  const pinchStartDistRef = useRef<number | null>(null);
  const initialZoomRef = useRef<number>(1.0);

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

      // Obtener ancho y alto disponibles en el contenedor (maximizando área de lectura)
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
      const padX = isMobile ? 8 : 20;
      const padY = isMobile ? 8 : 20;
      const containerWidth = Math.max(container.clientWidth - padX, 200);
      const containerHeight = Math.max(container.clientHeight - padY, 200);

      // Escalar para que encaje al 100% en la pantalla ("Fit to screen / Fit to page")
      // Esto asegura que toda la página del libro se vea completa en la pantalla del celular sin recortes
      const scaleFitWidth = containerWidth / baseViewport.width;
      const scaleFitHeight = containerHeight / baseViewport.height;

      // Fit to page: usar la menor escala para que ni el ancho ni el alto se recorten en la pantalla
      const fitPageScale = Math.min(scaleFitWidth, scaleFitHeight);
      const calculatedScale = fitPageScale * zoomFactor;

      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
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

  // Reajustar automáticamente con ResizeObserver y resize de ventana
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (!isLoadingDoc && pdfDocRef.current) {
          renderCurrentPage();
        }
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    let observer: ResizeObserver | null = null;
    if (containerRef.current) {
      observer = new ResizeObserver(() => {
        handleResize();
      });
      observer.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      observer?.disconnect();
      clearTimeout(timeoutId);
    };
  }, [isLoadingDoc, renderCurrentPage]);

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

  // Notificar al Navbar sobre el estado del marcador
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('bmc-bookmark-status', {
      detail: {
        bookmarkedPage,
        isCurrentPageBookmarked: bookmarkedPage === currentPage
      }
    }));
  }, [bookmarkedPage, currentPage]);

  // Guardar página actual como marcador (favorito) en Firestore y localStorage
  const handleBookmarkCurrentPage = useCallback(async () => {
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
  }, [currentPage, userEmail]);

  // Escuchar trigger de marcador desde el Navbar
  useEffect(() => {
    const handleTrigger = () => {
      handleBookmarkCurrentPage();
    };
    window.addEventListener('bmc-bookmark-trigger', handleTrigger);
    return () => window.removeEventListener('bmc-bookmark-trigger', handleTrigger);
  }, [handleBookmarkCurrentPage]);

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

  // Gestos táctiles nativos y de pellizco (zoom con 2 dedos) y swipe de página (1 dedo)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
      pinchStartDistRef.current = null;
    } else if (e.touches.length === 2) {
      touchStartXRef.current = null;
      touchStartYRef.current = null;
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchStartDistRef.current = dist;
      initialZoomRef.current = zoomFactor;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDistRef.current !== null && pinchStartDistRef.current > 0) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scale = currentDist / pinchStartDistRef.current;
      const newZoom = Math.min(2.5, Math.max(0.75, initialZoomRef.current * scale));
      setZoomFactor(parseFloat(newZoom.toFixed(2)));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (pinchStartDistRef.current !== null) {
      pinchStartDistRef.current = null;
      return;
    }
    // Si la página tiene aumento (> 1.2x), permitir navegación y paneo libre sin pasar página por error
    if (touchStartXRef.current === null || zoomFactor > 1.2) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchEndX - touchStartXRef.current;
    const diffY = touchEndY - (touchStartYRef.current ?? touchEndY);
    touchStartXRef.current = null;
    touchStartYRef.current = null;

    // Umbral de 45px y dirección predominantemente horizontal
    if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY) * 1.3) {
      if (diffX > 0) {
        handlePrevPage(); // Deslizar hacia la derecha -> página anterior
      } else {
        handleNextPage(); // Deslizar hacia la izquierda -> página siguiente
      }
    }
  };

  const isCurrentPageBookmarked = bookmarkedPage === currentPage;

  return (
    <div 
      ref={containerRef}
      className={`w-full ${isSideBySide ? 'max-w-none px-0 py-0' : 'max-w-5xl mx-auto px-1 sm:px-4 md:px-6 py-0.5 sm:py-2'} flex-1 flex flex-col pb-16 sm:pb-24 relative`}
      style={{ touchAction: 'pan-x pan-y pinch-zoom' }}
    >
      {/* Toast sutil de confirmación del marcador guardado */}
      {bookmarkToast && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-neutral-900/95 text-white shadow-2xl border border-amber-400/50 backdrop-blur-md text-xs font-bold transition-all animate-bounce-short">
          <BookmarkCheck className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span>{bookmarkToast}</span>
        </div>
      )}

      {/* VISOR NATIVO DE PDF PROPIO: ÁREA DE LECTURA MAXIMIZADA */}
      <div 
        className="w-full flex-1 flex flex-col items-center justify-center rounded-2xl sm:rounded-3xl overflow-auto shadow-xl relative border-2 border-slate-300/80 bg-neutral-900/95 ring-1 ring-black/10 group p-1 sm:p-2 touch-pan-x touch-pan-y"
        style={{ 
          minHeight: isFullscreen ? 'calc(100dvh - 16px)' : 'calc(100dvh - 85px)',
          height: isFullscreen ? 'calc(100dvh - 16px)' : 'calc(100dvh - 85px)',
          touchAction: 'pan-x pan-y pinch-zoom'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onContextMenu={(e) => e.preventDefault()} // Ocultar menú contextual de guardado
      >

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

      {/* 2. NAVEGACIÓN INFERIOR MINIMALISTA CON SLIDER Y SALTO ESTRICTAMENTE A LA DERECHA */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] py-2 px-3 sm:px-6 pb-[max(0.6rem,env(safe-area-inset-bottom))]"
        aria-label="Navegación de páginas"
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
          
          {/* Barra deslizante (slider) horizontal conectada a las páginas del PDF */}
          <div className="flex-1 flex items-center gap-2 sm:gap-3">
            <span className="text-[11px] font-bold text-neutral-600 font-mono select-none min-w-[20px] text-right">
              {currentPage}
            </span>
            <input
              type="range"
              min={1}
              max={totalPages}
              value={currentPage}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) goToPage(val);
              }}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#7c3aed] transition"
              title="Desliza para hojear las páginas del libro"
            />
            <span className="text-[11px] font-bold text-neutral-400 font-mono select-none min-w-[24px]">
              {totalPages}
            </span>
          </div>

          {/* Estrictamente a la derecha: pequeño cuadro de texto numérico para escribir el número de página */}
          <form 
            onSubmit={handlePageJump} 
            className="flex items-center gap-1.5 flex-shrink-0"
          >
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
              className="w-12 sm:w-14 text-center font-bold text-xs sm:text-sm text-neutral-900 bg-neutral-100 border border-neutral-300 rounded-xl py-1 px-1 focus:outline-none focus:ring-2 focus:ring-[#7c3aed] shadow-inner"
              placeholder="1"
              title="Escribe el número de página y presiona Enter o Ir"
            />
            <button
              type="submit"
              className="px-2.5 py-1 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-[11px] font-bold transition cursor-pointer shadow-2xs active:scale-95"
              title="Saltar a esta página"
            >
              Ir
            </button>
          </form>

        </div>
      </nav>
    </div>
  );
};


