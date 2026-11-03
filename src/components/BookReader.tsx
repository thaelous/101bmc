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
  Download, 
  Trash2, 
  CheckCircle2
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

// Inicializador seguro para compatibilidad entre empaquetadores
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

  // Estados de almacenamiento offline en IndexedDB ("bmc_epub_offline")
  const [isOfflineSaved, setIsOfflineSaved] = useState(false);
  const [isSavingOffline, setIsSavingOffline] = useState(false);
  const [saveProgressText, setSaveProgressText] = useState<string>('');

  // Estados de navegación y posición en ePub.js
  const [currentLocationLabel, setCurrentLocationLabel] = useState<string>('Página 1');
  const [fontSizePercent, setFontSizePercent] = useState<number>(100);

  const containerRef = useRef<HTMLDivElement>(null);
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  // Comprobar estado offline al montar
  useEffect(() => {
    isEpubOfflineAvailable().then(avail => setIsOfflineSaved(avail));
  }, []);

  // Carga del archivo EPUB utilizando el método ePub(localUrl) mediante Blob URLs para soporte offline
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

      // Asegurar que el contenedor DOM esté limpio y listo
      const containerEl = viewerContainerRef.current || document.getElementById('viewer-container');
      if (!containerEl) {
        throw new Error('El contenedor del visor no se encuentra en el DOM.');
      }
      containerEl.innerHTML = '';

      // 1. Verificar si existe en IndexedDB "bmc_epub_offline" para soporte offline
      const offlineAvailable = await isEpubOfflineAvailable();
      setIsOfflineSaved(offlineAvailable);

      let bytes: ArrayBuffer | null = null;

      if (offlineAvailable) {
        const offlineBuffer = await getOfflineEpubData();
        if (offlineBuffer && offlineBuffer.byteLength > 1000) {
          bytes = offlineBuffer;
        }
      }

      // 2. Si no estaba guardado localmente, descargar con Firebase Storage SDK
      if (!bytes) {
        bytes = await getDigitalBookEpubBytes();
        // Guardar automáticamente en IndexedDB para disponibilidad offline inmediata
        saveEpubOffline(bytes)
          .then(() => setIsOfflineSaved(true))
          .catch(() => {});
      }

      if (!bytes || bytes.byteLength < 1000) {
        throw new Error('El archivo del libro digital no contiene datos válidos.');
      }

      // 3. Crear Blob y Blob URL (localUrl) para soportar persistencia offline sin restricciones de red
      const blob = new Blob([bytes], { type: 'application/epub+zip' });
      const localUrl = URL.createObjectURL(blob);
      blobUrlRef.current = localUrl;

      // 4. Inicializar ePub con la localUrl generada desde el Blob
      const book = initEpubBook(localUrl);
      bookRef.current = book;

      // 5. Configurar la instancia de renderizado en 'viewer-container'
      const rendition = book.renderTo("viewer-container", { width: "100%", height: "100%" });
      renditionRef.current = rendition;

      // Estilos tipográficos limpios y legibles
      rendition.themes.default({
        'body': {
          'font-family': "'Plus Jakarta Sans', system-ui, sans-serif !important",
          'color': '#0f2147 !important',
          'background': '#ffffff !important',
          'padding': '16px 20px !important',
          'line-height': '1.65 !important'
        },
        'p': {
          'font-size': '16px !important',
          'line-height': '1.7 !important',
          'margin-bottom': '1em !important'
        },
        'h1, h2, h3, h4': {
          'font-family': "'Outfit', sans-serif !important",
          'color': '#0f2147 !important',
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

      // Inicializar y mostrar el libro
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

  // Navegación conectada de forma robusta a rendition.prev()
  const goToPrev = () => {
    if (renditionRef.current) {
      try {
        renditionRef.current.prev();
      } catch (err) {
        console.warn('[BookReader] Error al ir a página anterior:', err);
      }
    }
  };

  // Navegación conectada de forma robusta a rendition.next()
  const goToNext = () => {
    if (renditionRef.current) {
      try {
        renditionRef.current.next();
      } catch (err) {
        console.warn('[BookReader] Error al ir a página siguiente:', err);
      }
    }
  };

  // Control de tamaño de fuente
  const changeFontSize = (delta: number) => {
    const newSize = Math.max(70, Math.min(180, fontSizePercent + delta));
    setFontSizePercent(newSize);
    if (renditionRef.current) {
      renditionRef.current.themes.fontSize(`${newSize}%`);
    }
  };

  // Guardar libro EPUB offline en IndexedDB ("bmc_epub_offline")
  const handleSaveEpubOffline = async () => {
    try {
      setIsSavingOffline(true);
      setSaveProgressText('Descargando y guardando libro...');

      const arrayBuffer = await getDigitalBookEpubBytes();
      await saveEpubOffline(arrayBuffer);
      setIsOfflineSaved(true);
    } catch (err: any) {
      console.warn('[BookReader] Error guardando EPUB offline:', err);
      alert('No se pudo guardar el libro para leer sin conexión. Por favor reintenta.');
    } finally {
      setIsSavingOffline(false);
      setSaveProgressText('');
    }
  };

  // Eliminar libro EPUB de IndexedDB
  const handleDeleteEpubOffline = async () => {
    try {
      await deleteOfflineEpub();
      setIsOfflineSaved(false);
    } catch (err) {
      console.warn('[BookReader] Error eliminando EPUB offline:', err);
    }
  };

  // Pantalla completa
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
      className={`w-full ${isSideBySide ? 'max-w-none px-0 py-0' : 'max-w-5xl mx-auto px-2 sm:px-4 md:px-6 py-2 sm:py-4'} flex-1 flex flex-col select-none`}
    >
      {/* BARRA SUPERIOR CON CONTROLES LIMPIOS */}
      <div className="glass-card rounded-2xl p-3 sm:p-4 mb-3 sm:mb-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        
        {/* Identidad del Libro */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-tr from-[#7c3aed] to-[#4f96fe] text-white shadow-md flex-shrink-0">
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="font-heading text-xs sm:text-sm md:text-base font-black text-[#0f2147] uppercase tracking-tight truncate">
                101 BUENOS MALOS CONSEJOS
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>EPUB Oficial</span>
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
              Libro Digital &bull; Por Robert Pacheco
            </p>
          </div>
        </div>

        {/* Acciones y Botones de Control */}
        <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 flex-wrap">
          
          {/* Botón: Guardar libro EPUB offline */}
          {isOfflineSaved ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>✅ Libro guardado offline</span>
              <button
                type="button"
                onClick={handleDeleteEpubOffline}
                className="text-slate-400 hover:text-red-500 ml-1 p-0.5 rounded transition cursor-pointer"
                title="Eliminar de la memoria del dispositivo"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : isSavingOffline ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#7c3aed]/10 text-[#7c3aed] border border-[#7c3aed]/20 text-xs font-bold">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>{saveProgressText || 'Guardando offline...'}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSaveEpubOffline}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-bold shadow-md shadow-[#7c3aed]/25 transition active:scale-95 cursor-pointer"
              title="Guarda el libro en IndexedDB para leerlo sin conexión a internet o en modo avión"
            >
              <Download className="w-3.5 h-3.5" />
              <span>📥 Guardar Libro Offline</span>
            </button>
          )}

          {/* Ajuste de Tamaño de Fuente */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => changeFontSize(-10)}
              className="px-2 py-1 rounded-lg hover:bg-white text-slate-700 font-bold transition cursor-pointer"
              title="Reducir letra"
            >
              A-
            </button>
            <span className="text-[11px] font-mono font-bold text-slate-500 px-1">
              {fontSizePercent}%
            </span>
            <button
              type="button"
              onClick={() => changeFontSize(10)}
              className="px-2 py-1 rounded-lg hover:bg-white text-slate-700 font-bold transition cursor-pointer"
              title="Aumentar letra"
            >
              A+
            </button>
          </div>

          {/* Botones de Navegación en la Barra Superior */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={goToPrev}
              disabled={isLoading}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-700 hover:bg-white hover:text-[#7c3aed] text-xs font-bold transition disabled:opacity-30 cursor-pointer active:scale-95"
              title="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden md:inline">Anterior</span>
            </button>
            <button
              type="button"
              onClick={goToNext}
              disabled={isLoading}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-700 hover:bg-white hover:text-[#7c3aed] text-xs font-bold transition disabled:opacity-30 cursor-pointer active:scale-95"
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
            className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 transition shadow-xs cursor-pointer"
            title="Recargar libro"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#7c3aed]' : ''}`} />
          </button>

          {/* Pantalla Completa */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
            title="Pantalla completa"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>

      </div>

      {/* ÁREA PRINCIPAL DEL VISOR EPUB */}
      <div 
        className="w-full flex-1 flex flex-col rounded-2xl sm:rounded-3xl overflow-hidden glass-card shadow-xl relative border border-white/80 bg-white"
        style={{ minHeight: isFullscreen ? 'calc(100vh - 100px)' : 'calc(75vh)' }}
      >
        {/* Overlay de Carga (Sobrepuesto sin desmontar el visor del DOM) */}
        {isLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-8 text-center bg-white/95 backdrop-blur-xs">
            <Loader2 className="w-8 h-8 text-[#7c3aed] animate-spin mb-3" />
            <h3 className="font-heading text-base font-bold text-[#0f2147] mb-1">
              Abriendo libro digital EPUB...
            </h3>
            <p className="text-xs text-slate-500">
              Formateando páginas oficiales y capítulos...
            </p>
          </div>
        )}

        {/* Overlay de Error */}
        {error && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-8 text-center bg-white">
            <div className="w-12 h-12 rounded-full p-2 bg-red-100 text-red-600 flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="font-heading text-base font-bold text-[#0f2147] mb-1">
              No se pudo abrir el libro
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mb-4">
              {error}
            </p>
            <button
              type="button"
              onClick={loadEpubBook}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7c3aed] text-white text-xs font-bold hover:bg-[#6d28d9] transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reintentar</span>
            </button>
          </div>
        )}

        {/* CONTENEDOR SIEMPRE PRESENTE EN EL DOM PARA EVITAR ERRORES DE MONTAJE DE EPUBJS */}
        <div 
          id="viewer-container" 
          ref={viewerContainerRef} 
          className="w-full flex-1 h-full min-h-[500px] overflow-hidden bg-white"
        />

        {/* BARRA INFERIOR DE NAVEGACIÓN Y AVANCE */}
        <div className="p-3 sm:p-3.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between gap-3 shadow-xs z-10">
          {/* Botón Página Anterior */}
          <button
            type="button"
            onClick={goToPrev}
            className="flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl bg-white hover:bg-[#7c3aed] hover:text-white text-[#0f2147] text-xs sm:text-sm font-bold border border-slate-200 transition active:scale-95 cursor-pointer shadow-2xs"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>◀ Anterior</span>
          </button>

          {/* Ubicación / Progreso */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs whitespace-nowrap">
              {currentLocationLabel}
            </span>
          </div>

          {/* Botón Página Siguiente */}
          <button
            type="button"
            onClick={goToNext}
            className="flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs sm:text-sm font-bold transition active:scale-95 cursor-pointer shadow-md shadow-[#7c3aed]/25"
          >
            <span>Siguiente ▶</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
};
