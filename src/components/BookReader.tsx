import React, { useState, useEffect, useRef, useCallback } from 'react';
import ePub from "epubjs";
import type { Book, Rendition } from 'epubjs';
import { 
  Maximize2, 
  Minimize2, 
  ShieldCheck, 
  AlertCircle, 
  Loader2, 
  BookOpen, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from 'lucide-react';
import { getDigitalBookEpubBytes } from '../firebase/config';
import { 
  isEpubOfflineAvailable, 
  saveEpubOffline, 
  getOfflineEpubData, 
  deleteOfflineEpub 
} from '../services/offlineEpubVault';

interface BookReaderProps {
  userEmail: string;
  isSideBySide?: boolean;
}

// Inicializador seguro para compatibilidad entre empaquetadores (ESM / CJS)
const initEpubBook = (localUrl: string): Book => {
  const epubFactory: any = typeof ePub === 'function' ? ePub : (ePub as any).default;
  return epubFactory(localUrl);
};

export const BookReader: React.FC<BookReaderProps> = ({
  userEmail,
  isSideBySide = false
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Estados de almacenamiento protegido offline en IndexedDB ("bmc_epub_offline")
  const [isOfflineSaved, setIsOfflineSaved] = useState(false);
  const [isSavingOffline, setIsSavingOffline] = useState(false);

  // Estados de navegación, página actual y Zoom Dinámico Centrado
  const [currentLocationLabel, setCurrentLocationLabel] = useState<string>('Página 1');
  const [zoomLevel, setZoomLevel] = useState<number>(100); // 80% a 150%

  const containerRef = useRef<HTMLDivElement>(null);
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  // Comprobar estado offline al montar
  useEffect(() => {
    isEpubOfflineAvailable().then(avail => setIsOfflineSaved(avail));
  }, []);

  // Carga del archivo EPUB utilizando el método ePub(localUrl) mediante Blob en memoria RAM
  const loadEpubBook = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Limpiar visor, libro y Blob URL anterior si existen
      if (renditionRef.current) {
        try {
          renditionRef.current.destroy();
        } catch {}
        renditionRef.current = null;
      }
      if (bookRef.current) {
        try {
          bookRef.current.destroy();
        } catch {}
        bookRef.current = null;
      }
      if (blobUrlRef.current) {
        try {
          URL.revokeObjectURL(blobUrlRef.current);
        } catch {}
        blobUrlRef.current = null;
      }

      // Asegurar que el contenedor DOM #viewer esté limpio y listo
      const containerEl = viewerContainerRef.current || document.getElementById('viewer');
      if (!containerEl) {
        throw new Error('El contenedor del visor (#viewer) no se encuentra en el DOM.');
      }
      containerEl.innerHTML = '';

      // 1. Verificar si existe en IndexedDB "bmc_epub_offline" para carga protegida instantánea
      const offlineAvailable = await isEpubOfflineAvailable();
      setIsOfflineSaved(offlineAvailable);

      let bytes: ArrayBuffer | null = null;

      if (offlineAvailable) {
        const offlineBuffer = await getOfflineEpubData();
        if (offlineBuffer && offlineBuffer.byteLength > 1000) {
          bytes = offlineBuffer;
        }
      }

      // 2. Si no estaba guardado en IndexedDB, descargar datos binarios protegidos desde Firebase Storage
      if (!bytes) {
        bytes = await getDigitalBookEpubBytes();
        // Almacenar automáticamente en IndexedDB para disponibilidad offline sin exposición de URLs
        saveEpubOffline(bytes)
          .then(() => setIsOfflineSaved(true))
          .catch(() => {});
      }

      if (!bytes || bytes.byteLength < 1000) {
        throw new Error('El archivo del libro digital no contiene datos válidos.');
      }

      // 3. Crear Blob efímero en memoria RAM y ObjectURL local (evita URLs expuestas y bloqueos CORS)
      const blob = new Blob([bytes], { type: 'application/epub+zip' });
      const localUrl = URL.createObjectURL(blob);
      blobUrlRef.current = localUrl;

      // 4. Inicializar ePub con la localUrl generada desde el Blob protegido
      const book = initEpubBook(localUrl);
      bookRef.current = book;

      // 5. Configurar rendition obligatoriamente con spread: "none" y flow: "paginated" (estrictamente una sola página individual)
      const rendition = book.renderTo("viewer", {
        width: "100%",
        height: "100%",
        spread: "none",
        flow: "paginated"
      });
      renditionRef.current = rendition;

      // Estilos tipográficos estrictos: Letras 100% en negro puro (#000000) sobre fondo blanco (#FFFFFF)
      rendition.themes.default({
        'body': {
          'font-family': "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif !important",
          'color': '#000000 !important',
          'background': '#FFFFFF !important',
          'padding': '24px 32px !important',
          'line-height': '1.7 !important',
          'margin': '0 auto !important'
        },
        'p, span, div, li': {
          'color': '#000000 !important',
          'font-size': '17px !important',
          'line-height': '1.75 !important'
        },
        'a': {
          'color': '#000000 !important',
          'text-decoration': 'none !important'
        },
        'h1, h2, h3, h4, h5, h6': {
          'font-family': "'Outfit', sans-serif !important",
          'color': '#000000 !important',
          'font-weight': '800 !important'
        }
      });

      // Escuchar eventos de renderizado para ocultar de inmediato el overlay de carga
      rendition.on('rendered', () => {
        setIsLoading(false);
      });
      rendition.on('started', () => {
        setIsLoading(false);
      });
      rendition.on('displayed', () => {
        setIsLoading(false);
      });

      // Inicializar y mostrar la página actual o guardada
      const savedLocation = localStorage.getItem('bmc_epub_last_location');
      await rendition.display(savedLocation || undefined);

      // Monitoreo de ubicación y avance
      rendition.on('relocated', (location: any) => {
        setIsLoading(false);
        if (location && location.start) {
          const cfi = location.start.cfi;
          if (cfi) {
            localStorage.setItem('bmc_epub_last_location', cfi);
          }
          if (location.start.displayed && location.start.displayed.page) {
            setCurrentLocationLabel(`Página ${location.start.displayed.page} de ${location.start.displayed.total || ''}`);
          } else if (location.start.index !== undefined) {
            setCurrentLocationLabel(`Capítulo ${location.start.index + 1}`);
          }
        }
      });

      // Navegación con teclado en el iframe del libro
      rendition.on('keyup', (e: KeyboardEvent) => {
        if (e.key === 'ArrowLeft') goToPrev();
        if (e.key === 'ArrowRight') goToNext();
      });

      // Ocultar de inmediato el indicador de carga tan pronto esté listo y pintado
      setIsLoading(false);
    } catch (err: any) {
      console.warn('[BookReader] Error al cargar EPUB mediante Blob URL local:', err?.message || err);
      setIsLoading(false);
      setError('No se pudo abrir el libro digital. Por favor verifica tu conexión o haz clic en Reintentar.');
    }
  }, []);

  useEffect(() => {
    loadEpubBook();

    return () => {
      // Liberar URL temporal de la memoria RAM del navegador
      if (blobUrlRef.current) {
        try {
          URL.revokeObjectURL(blobUrlRef.current);
        } catch {}
        blobUrlRef.current = null;
      }
      if (renditionRef.current) {
        try {
          renditionRef.current.destroy();
        } catch {}
      }
      if (bookRef.current) {
        try {
          bookRef.current.destroy();
        } catch {}
      }
    };
  }, [loadEpubBook]);

  // Navegación inmediata a rendition.prev()
  const goToPrev = () => {
    if (renditionRef.current) {
      try {
        renditionRef.current.prev();
      } catch (err) {
        console.warn('[BookReader] Error al ir a página anterior:', err);
      }
    }
  };

  // Navegación inmediata a rendition.next()
  const goToNext = () => {
    if (renditionRef.current) {
      try {
        renditionRef.current.next();
      } catch (err) {
        console.warn('[BookReader] Error al ir a página siguiente:', err);
      }
    }
  };

  // Controles de Zoom Dinámico proporcional desde el centro (+ y -)
  const zoomIn = () => {
    setZoomLevel(prev => {
      const next = Math.min(150, prev + 10);
      if (renditionRef.current) {
        try {
          renditionRef.current.themes.fontSize(`${next}%`);
        } catch {}
      }
      return next;
    });
  };

  const zoomOut = () => {
    setZoomLevel(prev => {
      const next = Math.max(75, prev - 10);
      if (renditionRef.current) {
        try {
          renditionRef.current.themes.fontSize(`${next}%`);
        } catch {}
      }
      return next;
    });
  };

  const resetZoom = () => {
    setZoomLevel(100);
    if (renditionRef.current) {
      try {
        renditionRef.current.themes.fontSize('100%');
      } catch {}
    }
  };

  // Guardar libro EPUB offline en IndexedDB ("bmc_epub_offline") sin exponer URLs públicas
  const handleSaveEpubOffline = async () => {
    try {
      setIsSavingOffline(true);
      const arrayBuffer = await getDigitalBookEpubBytes();
      await saveEpubOffline(arrayBuffer);
      setIsOfflineSaved(true);
    } catch (err: any) {
      console.warn('[BookReader] Error guardando EPUB offline:', err);
    } finally {
      setIsSavingOffline(false);
    }
  };

  // Eliminar copia local de IndexedDB
  const handleDeleteEpubOffline = async () => {
    try {
      await deleteOfflineEpub();
      setIsOfflineSaved(false);
    } catch (err) {
      console.warn('[BookReader] Error eliminando EPUB offline:', err);
    }
  };

  // Modo pantalla completa
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

  return (
    <div 
      ref={containerRef}
      className={`w-full ${isSideBySide ? 'max-w-none px-0 py-0' : 'max-w-4xl mx-auto px-2 sm:px-4 md:px-6 py-2 sm:py-4'} flex-1 flex flex-col select-none`}
    >
      {/* BARRA SUPERIOR: METADATOS FIJOS Y CONTROLES DE ZOOM DINÁMICO */}
      <div className="glass-card rounded-2xl p-3 sm:p-4 mb-3 sm:mb-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-200/80 bg-white/95">
        
        {/* Metadatos Fijos Oficiales (Título y Autor) */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="p-2 sm:p-2.5 rounded-xl bg-neutral-900 text-white shadow-md flex-shrink-0">
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
          </div>
          <div className="overflow-hidden">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-heading text-xs sm:text-sm md:text-base font-black text-[#000000] uppercase tracking-tight truncate">
                101 buenos malos consejos para mi hijo
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>Memoria Protegida</span>
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-neutral-600 font-semibold truncate">
              Por Robert Pacheco &bull; Visor de 1 Página Individual
            </p>
          </div>
        </div>

        {/* Acciones de Navegación, Zoom Dinámico y Modo Offline Seguro */}
        <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 flex-wrap">
          
          {/* Estado de Memoria Local (Sin exposición de URLs ni enlaces de descarga externa) */}
          {isOfflineSaved ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Protegido en memoria</span>
              <button
                type="button"
                onClick={handleDeleteEpubOffline}
                className="text-slate-400 hover:text-red-500 p-0.5 rounded transition cursor-pointer"
                title="Liberar de memoria local"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : isSavingOffline ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Guardando...</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSaveEpubOffline}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer"
              title="Guardar de forma invisible en la base de datos local para lectura sin conexión"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Modo Offline</span>
            </button>
          )}

          {/* CONTROLES DE ZOOM DINÁMICO (+ y -) CENTRADO */}
          <div className="flex items-center gap-1 bg-neutral-100 p-0.5 rounded-xl border border-neutral-200 text-xs">
            <button
              type="button"
              onClick={zoomOut}
              className="p-1.5 rounded-lg hover:bg-white text-neutral-800 font-black transition cursor-pointer active:scale-95"
              title="Reducir hoja (Zoom -)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            
            <button
              type="button"
              onClick={resetZoom}
              className="px-1.5 py-0.5 text-[11px] font-mono font-bold text-neutral-700 hover:bg-white rounded transition"
              title="Restablecer zoom al 100%"
            >
              {zoomLevel}%
            </button>

            <button
              type="button"
              onClick={zoomIn}
              className="p-1.5 rounded-lg hover:bg-white text-neutral-800 font-black transition cursor-pointer active:scale-95"
              title="Aumentar hoja (Zoom +)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Botones de Navegación Inmediata en Barra Superior */}
          <div className="flex items-center gap-1 bg-neutral-100 p-0.5 rounded-xl border border-neutral-200">
            <button
              type="button"
              onClick={goToPrev}
              disabled={isLoading}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-neutral-900 hover:bg-white text-xs font-black transition disabled:opacity-30 cursor-pointer active:scale-95"
              title="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden md:inline">Anterior</span>
            </button>
            <button
              type="button"
              onClick={goToNext}
              disabled={isLoading}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-neutral-900 hover:bg-white text-xs font-black transition disabled:opacity-30 cursor-pointer active:scale-95"
              title="Página siguiente"
            >
              <span className="hidden md:inline">Siguiente</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Recargar */}
          <button
            type="button"
            onClick={loadEpubBook}
            className="p-2 rounded-xl bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200 transition shadow-2xs cursor-pointer"
            title="Recargar libro"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-neutral-900' : ''}`} />
          </button>

          {/* Pantalla Completa */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold transition cursor-pointer"
            title="Pantalla completa"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>

      </div>

      {/* ÁREA PRINCIPAL DEL VISOR EPUB: FONDO BLANCO PURO (#FFFFFF) Y DISPLAY FLEX CENTRADO */}
      <div 
        className="w-full flex-1 flex flex-col rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl relative border border-slate-300 bg-[#FFFFFF]"
        style={{ 
          minHeight: isFullscreen ? 'calc(100vh - 100px)' : 'calc(75vh)',
          backgroundColor: '#FFFFFF'
        }}
      >
        {/* Overlay de Carga protegido */}
        {isLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-8 text-center bg-white/95 backdrop-blur-xs">
            <Loader2 className="w-8 h-8 text-neutral-900 animate-spin mb-3" />
            <h3 className="font-heading text-base font-bold text-[#000000] mb-1">
              Abriendo libro digital...
            </h3>
            <p className="text-xs text-neutral-500 font-medium">
              Cargando página individual protegida en memoria RAM...
            </p>
          </div>
        )}

        {/* Overlay de Error */}
        {error && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-8 text-center bg-white">
            <div className="w-12 h-12 rounded-full p-2 bg-red-100 text-red-600 flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="font-heading text-base font-bold text-[#000000] mb-1">
              No se pudo abrir el libro
            </h3>
            <p className="text-xs text-neutral-600 max-w-sm mb-4">
              {error}
            </p>
            <button
              type="button"
              onClick={loadEpubBook}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reintentar</span>
            </button>
          </div>
        )}

        {/* CONTENEDOR EXTERIOR #viewer CON DISPLAY FLEX, CENTRADO Y FONDO BLANCO PURO (#FFFFFF) */}
        <div className="w-full flex-1 flex items-center justify-center bg-[#FFFFFF] p-2 sm:p-4 overflow-hidden">
          <div 
            id="viewer" 
            ref={viewerContainerRef} 
            className="w-full h-full min-h-[500px] sm:min-h-[600px] max-w-3xl flex items-center justify-center bg-[#FFFFFF] shadow-sm rounded-lg"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#FFFFFF',
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'center center',
              transition: 'transform 0.15s ease-out'
            }}
          />
        </div>

        {/* BARRA INFERIOR DE NAVEGACIÓN INMEDIATA */}
        <div className="p-3 sm:p-3.5 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between gap-3 shadow-xs z-10">
          {/* Botón Página Anterior */}
          <button
            type="button"
            onClick={goToPrev}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-xl bg-white hover:bg-neutral-900 hover:text-white text-neutral-900 text-xs sm:text-sm font-black border border-neutral-300 transition active:scale-95 cursor-pointer shadow-2xs disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>◀ Anterior</span>
          </button>

          {/* Ubicación / Progreso */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-neutral-900 bg-white px-3 py-1.5 rounded-xl border border-neutral-300 shadow-2xs whitespace-nowrap">
              {currentLocationLabel}
            </span>
          </div>

          {/* Botón Página Siguiente */}
          <button
            type="button"
            onClick={goToNext}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs sm:text-sm font-black transition active:scale-95 cursor-pointer shadow-md disabled:opacity-30"
          >
            <span>Siguiente ▶</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
};
