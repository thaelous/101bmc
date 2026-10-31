import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Maximize2, 
  Minimize2, 
  ShieldCheck, 
  AlertCircle, 
  Loader2, 
  BookOpen, 
  CheckCircle2, 
  RefreshCw, 
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Chapter } from '../types';
import { getDigitalBookPdfUrl } from '../firebase/config';
import { titulosOficiales } from '../data/chaptersData';

interface BookReaderProps {
  chapters?: Chapter[];
  currentChapterIndex?: number;
  onChapterSelect?: (index: number) => void;
  userEmail: string;
  isSideBySide?: boolean;
}

export const BookReader: React.FC<BookReaderProps> = ({
  currentChapterIndex = 0,
  onChapterSelect,
  userEmail,
  isSideBySide = false
}) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [useWebEngine, setUseWebEngine] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Página del libro correspondiente al capítulo actual (1 a 113)
  const targetPage = useMemo(() => {
    return Math.max(1, Math.min(113, (currentChapterIndex ?? 0) + 1));
  }, [currentChapterIndex]);

  const currentChapterTitle = useMemo(() => {
    return titulosOficiales[targetPage] || `Capítulo ${targetPage}`;
  }, [targetPage]);

  // Cargar URL del libro digital de forma segura
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

  // Bloqueo de atajos de teclado para descarga e impresión (Ctrl+P, Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P' || e.key === 's' || e.key === 'S')) {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // URL del PDF protegida y sincronizada a la página exacta del capítulo
  const protectedPdfSrc = useMemo(() => {
    if (!pdfUrl) return null;
    if (useWebEngine) {
      return `https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true#page=${targetPage}`;
    }
    return `${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&page=${targetPage}`;
  }, [pdfUrl, targetPage, useWebEngine]);

  // Sincronizar dinámicamente el iframe cuando cambia el capítulo
  useEffect(() => {
    if (iframeRef.current && protectedPdfSrc) {
      iframeRef.current.src = protectedPdfSrc;
    }
  }, [protectedPdfSrc]);

  return (
    <div 
      ref={containerRef}
      className={`w-full ${isSideBySide ? 'max-w-none px-0 py-0' : 'max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8'} flex-1 flex flex-col ${
        isFullscreen ? 'bg-slate-900 p-4 fixed inset-0 z-50 max-w-none' : ''
      }`}
    >
      {/* Barra Superior del Visor de Libro Digital */}
      <div className="glass-card rounded-2xl p-4 sm:p-5 mb-4 sm:mb-6 shadow-md flex flex-wrap items-center justify-between gap-3">
        
        {/* Información del Libro Oficial */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-[#7c3aed] to-[#4f96fe] text-white shadow-md">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-sm sm:text-base font-black text-[#0f2147] uppercase tracking-tight">
                101 BUENOS MALOS CONSEJOS PARA MI HIJO
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>Libro Oficial</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Libro Digital &bull; Por Robert Pacheco
            </p>
          </div>
        </div>

        {/* Acciones y Sincronización */}
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          
          {/* Badge de Sincronización con el Audio */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#7c3aed]/10 text-[#7c3aed] text-xs font-bold border border-[#7c3aed]/20">
            <Sparkles className="w-3.5 h-3.5 text-[#7c3aed]" />
            <span className="truncate max-w-[140px] sm:max-w-xs">{currentChapterTitle}</span>
            <span className="text-[10px] bg-[#7c3aed] text-white px-1.5 py-0.5 rounded-md font-mono">
              Pág. {targetPage}
            </span>
          </div>

          {/* Navegación rápida de páginas */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              onClick={() => onChapterSelect && onChapterSelect(Math.max(0, currentChapterIndex - 1))}
              disabled={currentChapterIndex <= 0}
              className="p-1 rounded-lg hover:bg-white text-slate-700 disabled:opacity-30 transition"
              title="Capítulo anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono font-bold px-1.5 text-[#0f2147]">
              {targetPage}/113
            </span>
            <button
              onClick={() => onChapterSelect && onChapterSelect(Math.min(112, currentChapterIndex + 1))}
              disabled={currentChapterIndex >= 112}
              className="p-1 rounded-lg hover:bg-white text-slate-700 disabled:opacity-30 transition"
              title="Capítulo siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Botón de Recargar */}
          <button
            onClick={loadPdf}
            className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 transition"
            title="Recargar libro digital"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingPdf ? 'animate-spin text-[#7c3aed]' : ''}`} />
          </button>

          {/* Indicador de Lectura Protegida (Anti-descarga) */}
          <div className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Protegido</span>
          </div>

          {/* Botón Pantalla Completa */}
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-bold shadow-md shadow-[#7c3aed]/30 transition"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Salir</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pantalla Completa</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* ÁREA PRINCIPAL: VISOR EXCLUSIVO Y PROTEGIDO DEL LIBRO DIGITAL */}
      <div 
        className="w-full flex-1 flex flex-col rounded-3xl overflow-hidden glass-card shadow-xl relative border border-white/80 bg-white"
        style={{ minHeight: '650px' }}
      >
        
        {isLoadingPdf ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white/60 min-h-[70vh]">
            <div className="w-14 h-14 rounded-full p-2 bg-[#7c3aed]/10 flex items-center justify-center mb-4">
              <Loader2 className="w-8 h-8 text-[#7c3aed] animate-spin" />
            </div>
            <h3 className="font-heading text-lg font-black text-[#0f2147] mb-1">
              Cargando libro digital...
            </h3>
            <p className="text-xs text-slate-500 max-w-sm">
              Preparando la lectura interactiva sincronizada con el audiolibro.
            </p>
          </div>
        ) : pdfError ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white/70 min-h-[70vh]">
            <div className="w-14 h-14 rounded-full p-2 bg-red-100 flex items-center justify-center mb-4 text-red-600">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="font-heading text-lg font-black text-[#0f2147] mb-1">
              No se pudo cargar el libro digital
            </h3>
            <p className="text-xs text-slate-600 max-w-md mb-6 leading-relaxed">
              Comprueba tu conexión a internet o intenta recargar nuevamente.
            </p>
            <button
              onClick={loadPdf}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7c3aed] text-white text-xs font-black uppercase tracking-wider shadow-md hover:bg-[#6d28d9] transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reintentar Carga</span>
            </button>
          </div>
        ) : protectedPdfSrc ? (
          <div 
            className={`w-full ${isFullscreen ? 'h-full' : 'h-[660px]'} relative bg-white rounded-2xl overflow-hidden flex flex-col border border-slate-200 select-none shadow-sm`}
            style={{ height: isFullscreen ? 'calc(100vh - 120px)' : '660px', width: '100%' }}
            onContextMenu={(e) => e.preventDefault()}
          >
            {/* Visor oficial protegido con altura explícita de 600px y ancho 100% */}
            <iframe
              ref={iframeRef}
              src={protectedPdfSrc}
              title={`Libro Digital — ${currentChapterTitle}`}
              style={{ height: isFullscreen ? 'calc(100vh - 180px)' : '600px', width: '100%' }}
              className={`w-full ${isFullscreen ? 'h-full' : 'h-[600px]'} border-0 select-none bg-white block`}
            />

            {/* Barra inferior de estado y seguridad del documento */}
            <div 
              style={{ height: '56px' }} 
              className="h-[56px] px-4 py-2.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2 flex-shrink-0"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Edición oficial verificada &bull; Lector: <span className="text-[#7c3aed] font-bold">{userEmail}</span></span>
              </div>

              <div className="flex items-center gap-3 ml-auto">
                <button
                  type="button"
                  onClick={() => setUseWebEngine(prev => !prev)}
                  className="text-[11px] font-bold text-[#7c3aed] hover:text-[#6d28d9] hover:underline transition"
                  title="Cambiar visor en caso de pantalla oscura en tu navegador"
                >
                  {useWebEngine ? 'Usar Visor Directo' : '¿Pantalla negra? Cambiar visor'}
                </button>

                <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Protegido</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}

      </div>

    </div>
  );
};
