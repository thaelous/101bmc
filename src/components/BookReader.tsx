import React, { useState, useRef } from 'react';
import { 
  Maximize2, 
  Minimize2, 
  BookOpen, 
  RefreshCw, 
  Smartphone, 
  ExternalLink,
  ShieldCheck,
  Loader2
} from 'lucide-react';

interface BookReaderProps {
  userEmail: string;
  isSideBySide?: boolean;
}

// URL oficial del visor nativo responsivo de Google Drive para el libro digital
export const GOOGLE_DRIVE_PDF_PREVIEW_URL = 
  "https://drive.google.com/file/d/1hbBBCrH5TtS3KG-KHtRcbYbCgNZasvNk/preview";

export const BookReader: React.FC<BookReaderProps> = ({
  userEmail,
  isSideBySide = false
}) => {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [iframeKey, setIframeKey] = useState<number>(1);
  const [isIframeLoading, setIsIframeLoading] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Recargar el iframe
  const reloadIframe = () => {
    setIsIframeLoading(true);
    setIframeKey(prev => prev + 1);
  };

  return (
    <div 
      ref={containerRef}
      className={`w-full ${isSideBySide ? 'max-w-none px-0 py-0' : 'max-w-5xl mx-auto px-2 sm:px-4 md:px-6 py-2 sm:py-4'} flex-1 flex flex-col select-none`}
    >
      {/* BARRA SUPERIOR: METADATOS Y ACCIONES */}
      <div className="glass-card rounded-2xl p-3 sm:p-4 mb-3 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-200/80 bg-white/95">
        
        {/* Metadatos Oficiales */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="p-2 sm:p-2.5 rounded-xl bg-neutral-900 text-white shadow-md flex-shrink-0">
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
          </div>
          <div className="overflow-hidden">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-heading text-xs sm:text-sm md:text-base font-black text-[#000000] uppercase tracking-tight truncate">
                101 buenos malos consejos para mi hijo
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold uppercase">
                <Smartphone className="w-3 h-3 text-blue-600" />
                <span>PDF Móvil Oficial</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>Google Drive Nativo</span>
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-neutral-600 font-semibold truncate">
              Por Robert Pacheco &bull; 223 Páginas &bull; Zoom y Paginación Fluida
            </p>
          </div>
        </div>

        {/* Acciones del Visor */}
        <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
          {/* Botón Abrir en Pestaña Nueva */}
          <a
            href={GOOGLE_DRIVE_PDF_PREVIEW_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold transition shadow-2xs cursor-pointer"
            title="Abrir en pestaña completa de Google Drive"
          >
            <ExternalLink className="w-3.5 h-3.5 text-neutral-600" />
            <span className="hidden sm:inline">Pestaña Completa</span>
          </a>

          {/* Botón Recargar */}
          <button
            type="button"
            onClick={reloadIframe}
            className="p-2 rounded-xl bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200 transition shadow-2xs cursor-pointer"
            title="Recargar libro"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isIframeLoading ? 'animate-spin text-neutral-900' : ''}`} />
          </button>

          {/* Pantalla Completa */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold transition shadow-sm cursor-pointer"
            title="Pantalla completa"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Salir</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Pantalla Completa</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ÁREA PRINCIPAL: SOLUCIÓN NATIVA CON IFRAME DE GOOGLE DRIVE */}
      <div 
        className="w-full flex-1 flex flex-col rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl relative border border-slate-300 bg-white"
        style={{ 
          minHeight: isFullscreen ? 'calc(100vh - 110px)' : '620px',
          height: isFullscreen ? 'calc(100vh - 110px)' : '78vh'
        }}
      >
        {/* Indicador de carga mientras el iframe responde */}
        {isIframeLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-8 text-center bg-white/95 backdrop-blur-xs">
            <Loader2 className="w-10 h-10 text-neutral-900 animate-spin mb-3" />
            <h3 className="font-heading text-base font-bold text-[#000000] mb-1">
              Conectando con Google Drive...
            </h3>
            <p className="text-xs text-neutral-500 font-medium max-w-sm">
              Cargando el libro digital en el visor oficial responsivo...
            </p>
          </div>
        )}

        {/* IFRAME NATIVO DE GOOGLE DRIVE */}
        <iframe 
          key={iframeKey}
          src="https://drive.google.com/file/d/1hbBBCrH5TtS3KG-KHtRcbYbCgNZasvNk/preview" 
          width="100%" 
          height="100%" 
          style={{ border: 'none' }}
          className="w-full h-full flex-1 block"
          allow="autoplay"
          title="101 buenos malos consejos para mi hijo — Robert Pacheco"
          onLoad={() => setIsIframeLoading(false)}
        />
      </div>
    </div>
  );
};
