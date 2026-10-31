import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Maximize2, 
  Minimize2, 
  ShieldCheck, 
  AlertCircle, 
  Loader2, 
  BookOpen, 
  CheckCircle2, 
  RefreshCw
} from 'lucide-react';
import { getDigitalBookPdfUrl } from '../firebase/config';

interface BookReaderProps {
  userEmail: string;
  isSideBySide?: boolean;
}

export const BookReader: React.FC<BookReaderProps> = ({
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

  // URL del PDF protegida sin barra de herramientas, descarga ni impresión
  const protectedPdfSrc = useMemo(() => {
    if (!pdfUrl) return null;
    if (useWebEngine) {
      return `https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true`;
    }
    return `${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`;
  }, [pdfUrl, useWebEngine]);

  return (
    <div 
      ref={containerRef}
      className={`w-full ${isSideBySide ? 'max-w-none px-0 py-0' : 'max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-4'} flex-1 flex flex-col ${
        isFullscreen ? 'bg-slate-900 p-4 fixed inset-0 z-50 max-w-none' : ''
      }`}
    >
      {/* Barra Superior del Visor de Libro Digital */}
      <div className="glass-card rounded-2xl p-4 sm:p-5 mb-4 shadow-md flex flex-wrap items-center justify-between gap-3">
        
        {/* Información Oficial del Libro */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-[#7c3aed] to-[#4f96fe] text-white shadow-md">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-sm sm:text-base font-black text-[#0f2147] uppercase tracking-tight">
                101 BUENOS MALOS CONSEJOS PARA MI HIJO
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>Libro Oficial</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Libro Digital &bull; Por Robert Pacheco
            </p>
          </div>
        </div>

        {/* Acciones del Visor */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Botón de Recargar */}
          <button
            onClick={loadPdf}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 transition shadow-xs"
            title="Recargar libro digital"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingPdf ? 'animate-spin text-[#7c3aed]' : ''}`} />
          </button>

          {/* Indicador de Lectura Protegida (Anti-descarga) */}
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Lectura Protegida</span>
          </div>

          {/* Botón Pantalla Completa */}
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-bold shadow-md shadow-[#7c3aed]/30 transition"
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

      {/* ÁREA PRINCIPAL: VISOR DEL LIBRO DIGITAL */}
      <div 
        className="w-full flex-1 flex flex-col rounded-3xl overflow-hidden glass-card shadow-xl relative border border-white/80 bg-white"
        style={{ minHeight: isFullscreen ? 'calc(100vh - 100px)' : '650px' }}
      >
        
        {isLoadingPdf ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white/60 min-h-[650px]">
            <div className="w-14 h-14 rounded-full p-2 bg-[#7c3aed]/10 flex items-center justify-center mb-4">
              <Loader2 className="w-8 h-8 text-[#7c3aed] animate-spin" />
            </div>
            <h3 className="font-heading text-lg font-black text-[#0f2147] mb-1">
              Cargando libro digital...
            </h3>
            <p className="text-xs text-slate-500 max-w-sm">
              Conectando de forma segura para abrir tu libro digital oficial.
            </p>
          </div>
        ) : pdfError ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white/70 min-h-[650px]">
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
            className={`w-full ${isFullscreen ? 'h-full' : 'h-[80vh] min-h-[650px]'} relative bg-white rounded-2xl overflow-hidden flex flex-col border border-slate-200 select-none shadow-sm`}
            style={{ height: isFullscreen ? 'calc(100vh - 120px)' : '80vh', minHeight: '650px', width: '100%' }}
            onContextMenu={(e) => e.preventDefault()}
          >
            {/* Visor oficial protegido sin barra de herramientas, descarga ni impresión con altura explícita */}
            <iframe
              ref={iframeRef}
              src={protectedPdfSrc}
              title="Libro Digital Oficial — 101 Buenos Malos Consejos"
              style={{ height: isFullscreen ? 'calc(100vh - 180px)' : 'calc(80vh - 56px)', minHeight: '600px', width: '100%' }}
              className={`w-full ${isFullscreen ? 'h-full' : 'h-[600px] sm:h-[700px]'} border-0 select-none bg-white block flex-1`}
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
