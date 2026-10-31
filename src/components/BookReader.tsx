import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  ShieldCheck, 
  AlertCircle, 
  Loader2, 
  BookOpen, 
  CheckCircle2,
  RefreshCw,
  Book,
  Sparkles
} from 'lucide-react';
import { Chapter } from '../types';
import { getDigitalBookPdfUrl } from '../firebase/config';

interface BookReaderProps {
  chapters?: Chapter[];
  currentChapterIndex?: number;
  onChapterSelect?: (index: number) => void;
  userEmail: string;
  isSideBySide?: boolean;
}

export const BookReader: React.FC<BookReaderProps> = ({
  chapters = [],
  currentChapterIndex = 0,
  onChapterSelect,
  userEmail,
  isSideBySide = false
}) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<'pdf' | 'text'>('pdf');

  const containerRef = useRef<HTMLDivElement>(null);

  // Función para cargar el archivo PDF 101BMC.pdf desde Firebase Storage
  const loadPdf = async () => {
    setIsLoadingPdf(true);
    setPdfError(null);

    try {
      const result = await getDigitalBookPdfUrl();
      if (result.url) {
        setPdfUrl(result.url);
      } else {
        setPdfError(result.error || 'No se encontró el archivo 101BMC.pdf en Firebase Storage.');
      }
    } catch (err: any) {
      setPdfError(err?.message || 'Error de conexión al cargar 101BMC.pdf.');
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

  return (
    <div 
      ref={containerRef}
      className={`w-full ${isSideBySide ? 'max-w-none px-0 py-0' : 'max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8'} flex-1 flex flex-col ${
        isFullscreen ? 'bg-slate-900 p-4 fixed inset-0 z-50 max-w-none' : ''
      }`}
    >
      {/* Barra Superior del Visor de Libro Digital */}
      <div className="glass-card rounded-2xl p-4 sm:p-5 mb-4 sm:mb-6 shadow-md flex flex-wrap items-center justify-between gap-3">
        
        {/* Información del Libro */}
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
                <span>101BMC.pdf Oficial</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Libro Digital &bull; Por Robert Pacheco &bull; Firebase Storage
            </p>
          </div>
        </div>

        {/* Acciones y Botones del Visor */}
        <div className="flex items-center gap-2 ml-auto">
          
          {/* Selector de modo: PDF oficial vs Texto interactivo */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setViewMode('pdf')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                viewMode === 'pdf'
                  ? 'bg-white text-[#7c3aed] shadow-xs'
                  : 'text-slate-600 hover:text-[#0f2147]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Visor PDF</span>
            </button>

            <button
              onClick={() => setViewMode('text')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                viewMode === 'text'
                  ? 'bg-white text-[#7c3aed] shadow-xs'
                  : 'text-slate-600 hover:text-[#0f2147]'
              }`}
            >
              <Book className="w-3.5 h-3.5" />
              <span>Resumen</span>
            </button>
          </div>

          {/* Botón de Recargar */}
          <button
            onClick={loadPdf}
            className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 transition"
            title="Recargar archivo PDF desde Storage"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingPdf ? 'animate-spin text-[#7c3aed]' : ''}`} />
          </button>

          {/* Indicador de Lectura Protegida (Anti-descarga) */}
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Lectura Protegida</span>
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

      {/* ÁREA PRINCIPAL: VISOR DEL PDF 101BMC.pdf */}
      {viewMode === 'pdf' ? (
        <div className="flex-1 min-h-[70vh] sm:min-h-[80vh] flex flex-col rounded-3xl overflow-hidden glass-card shadow-xl relative border border-white/80">
          
          {isLoadingPdf ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white/60">
              <div className="w-14 h-14 rounded-full p-2 bg-[#7c3aed]/10 flex items-center justify-center mb-4">
                <Loader2 className="w-8 h-8 text-[#7c3aed] animate-spin" />
              </div>
              <h3 className="font-heading text-lg font-black text-[#0f2147] mb-1">
                Cargando 101BMC.pdf...
              </h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Conectando de forma segura con Firebase Storage para entregar tu libro digital oficial.
              </p>
            </div>
          ) : pdfError ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white/70">
              <div className="w-14 h-14 rounded-full p-2 bg-red-100 flex items-center justify-center mb-4 text-red-600">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="font-heading text-lg font-black text-[#0f2147] mb-1">
                No se pudo cargar 101BMC.pdf
              </h3>
              <p className="text-xs text-slate-600 max-w-md mb-6 leading-relaxed">
                Verifica que el archivo <strong className="font-mono text-[#0f2147]">101BMC.pdf</strong> se encuentre en la raíz de tu Firebase Storage (Bucket configurado) o revisa los permisos de lectura.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={loadPdf}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7c3aed] text-white text-xs font-black uppercase tracking-wider shadow-md hover:bg-[#6d28d9] transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reintentar Carga</span>
                </button>
                <button
                  onClick={() => setViewMode('text')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-[#0f2147] border border-slate-200 text-xs font-bold hover:bg-slate-50 transition"
                >
                  <Book className="w-3.5 h-3.5" />
                  <span>Ver Resumen del Libro</span>
                </button>
              </div>
            </div>
          ) : pdfUrl ? (
            <div 
              className="flex-1 flex flex-col relative w-full h-full bg-slate-900 min-h-[75vh] select-none"
              onContextMenu={(e) => e.preventDefault()}
            >
              {/* Visor oficial protegido sin barra de herramientas, descarga ni impresión */}
              <iframe
                src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH&pagemode=none`}
                title="101BMC.pdf — Visor Oficial Protegido"
                className="w-full flex-1 min-h-[75vh] border-0 select-none bg-slate-100"
              />

              {/* Barra inferior de estado y seguridad del documento */}
              <div className="p-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Documento oficial verificado &bull; Usuario: <span className="text-[#7c3aed] font-bold">{userEmail}</span></span>
                </div>

                <div className="flex items-center gap-1.5 ml-auto text-slate-500 font-semibold text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Protección contra copia e impresión activada</span>
                </div>
              </div>
            </div>
          ) : null}

        </div>
      ) : (
        /* VISTA ALTERNATIVA: RESUMEN Y CONSEJOS EN TEXTO */
        <div className="flex-1 rounded-3xl p-6 sm:p-8 glass-card shadow-xl text-left bg-white/90">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <span className="text-xs font-black uppercase text-[#7c3aed] tracking-wider">
                Resumen Oficial de la Obra
              </span>
              <h2 className="font-heading text-2xl font-black text-[#0f2147] mt-1">
                101 Buenos Malos Consejos Para Mi Hijo
              </h2>
              <p className="text-xs text-slate-500 font-medium italic mt-0.5">
                Por Robert Pacheco &bull; Edición Digital
              </p>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed">
              Esta obra compila las reflexiones más afiladas, lúcidas y honestas que desafían la autoayuda convencional. Para disfrutar de la maquetación completa con sus ilustraciones, carátulas y tipografía de imprenta, utiliza la pestaña superior <strong>"Visor PDF"</strong> (archivo <code className="font-mono text-[#7c3aed]">101BMC.pdf</code> cargado directamente de Firebase Storage).
            </p>

            <div className="p-4 rounded-2xl bg-[#7c3aed]/10 border border-[#7c3aed]/20 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-[#7c3aed] flex-shrink-0 mt-0.5" />
              <div className="text-xs text-[#0f2147] leading-relaxed">
                <strong>¿Sabías que?</strong> Tu acceso incluye el Combo completo: puedes leer el PDF <code className="font-mono">101BMC.pdf</code> en esta pestaña y escuchar los 113 capítulos de audio correspondientes en la pestaña <strong>"Audiolibro"</strong>.
              </div>
            </div>

            <div className="pt-4 flex justify-center">
              <button
                onClick={() => setViewMode('pdf')}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#7c3aed] text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-[#7c3aed]/40 hover:bg-[#6d28d9] transition"
              >
                <FileText className="w-4 h-4" />
                <span>Volver al Visor de 101BMC.pdf</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
