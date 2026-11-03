import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Maximize2, 
  Minimize2, 
  ShieldCheck, 
  AlertCircle, 
  Loader2, 
  BookOpen, 
  RefreshCw, 
  ZoomIn, 
  ZoomOut, 
  Layers, 
  BookMarked,
  Download,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { getDigitalBookPdfUrl } from '../firebase/config';
import { 
  isPdfOfflineAvailable, 
  savePdfOffline, 
  getOfflinePdfData, 
  deleteOfflinePdf,
  fetchPdfBinary 
} from '../services/offlinePdfVault';

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

  // Estados de almacenamiento offline en IndexedDB ("bmc_pdf_offline")
  const [isOfflineSaved, setIsOfflineSaved] = useState(false);
  const [isSavingOffline, setIsSavingOffline] = useState(false);
  const [downloadProgressText, setDownloadProgressText] = useState<string>('');

  // Modos de lectura: 'interactive' (Ojear) vs 'continuous' (Continuo)
  const [displayMode, setDisplayMode] = useState<'interactive' | 'continuous'>('interactive');

  // Documento PDF.js y estado de páginas
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [totalPages, setTotalPages] = useState<number>(223);
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
  const [isRenderingPage, setIsRenderingPage] = useState(false);
  const [zoomScale, setZoomScale] = useState(1.0);

  const containerRef = useRef<HTMLDivElement>(null);
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const renderedContinuousPagesRef = useRef<Set<number>>(new Set());

  // Comprobar si ya está guardado offline al montar
  useEffect(() => {
    isPdfOfflineAvailable().then(avail => setIsOfflineSaved(avail));
  }, []);

  // Guardar última página leída en localStorage
  useEffect(() => {
    if (currentPage > 0) {
      try {
        localStorage.setItem('bmc_ultima_pagina_lectura', currentPage.toString());
      } catch {}
    }
  }, [currentPage]);

  // Asegurar que pdfjsLib esté listo
  const ensurePdfJsReady = async (): Promise<any> => {
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      return window.pdfjsLib;
    }

    return new Promise((resolve, reject) => {
      let tries = 0;
      const interval = setInterval(() => {
        if (window.pdfjsLib) {
          clearInterval(interval);
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          resolve(window.pdfjsLib);
        } else if (tries > 30) {
          clearInterval(interval);
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          script.onload = () => {
            if (window.pdfjsLib) {
              window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
              resolve(window.pdfjsLib);
            } else {
              reject(new Error('PDF.js no pudo inicializarse'));
            }
          };
          script.onerror = () => reject(new Error('Error cargando PDF.js desde CDN'));
          document.head.appendChild(script);
        }
        tries++;
      }, 100);
    });
  };

  // Carga directa del libro PDF
  const loadBook = useCallback(async () => {
    setIsLoadingPdf(true);
    setPdfError(null);
    setDownloadProgressText('Iniciando lector oficial...');

    try {
      const pdfjs = await ensurePdfJsReady();

      // 1. Verificar si existe en IndexedDB "bmc_pdf_offline"
      const offlineAvailable = await isPdfOfflineAvailable();
      setIsOfflineSaved(offlineAvailable);

      let loadingTask: any = null;

      if (offlineAvailable) {
        setDownloadProgressText('Cargando libro desde memoria offline...');
        const offlineBuffer = await getOfflinePdfData();
        if (offlineBuffer && offlineBuffer.byteLength > 0) {
          loadingTask = pdfjs.getDocument({
            data: offlineBuffer,
            cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
            cMapPacked: true
          });
        }
      }

      // 2. Si no estaba offline o falló, cargar desde Firebase Storage eludiendo CORS
      if (!loadingTask) {
        setDownloadProgressText('Conectando con el servidor...');
        let resolvedUrl = pdfUrl;
        if (!resolvedUrl) {
          const res = await getDigitalBookPdfUrl();
          resolvedUrl = res.url;
          if (resolvedUrl) setPdfUrl(resolvedUrl);
        }

        if (!resolvedUrl) {
          throw new Error('No se pudo encontrar el libro digital en el servidor.');
        }

        setDownloadProgressText('Descargando páginas en memoria segura...');
        // fetchPdfBinary utiliza SDK getBlob/getBytes, corsproxy.io y XHR para evitar bloqueo CORS
        let arrayBuffer: ArrayBuffer | null = null;
        try {
          arrayBuffer = await fetchPdfBinary(resolvedUrl);
        } catch (fetchErr) {
          console.warn('[BookReader] fetchPdfBinary aviso, probando proxy directo:', fetchErr);
        }

        if (arrayBuffer && arrayBuffer.byteLength > 1000) {
          // Guardar en IndexedDB ("bmc_pdf_store") para disponibilidad sin conexión
          savePdfOffline(arrayBuffer).then(() => setIsOfflineSaved(true)).catch(() => {});

          loadingTask = pdfjs.getDocument({
            data: arrayBuffer,
            cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
            cMapPacked: true
          });
        } else {
          // Si no se obtuvo buffer, cargar envolviendo con corsproxy.io
          const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(resolvedUrl)}`;
          loadingTask = pdfjs.getDocument({
            url: proxyUrl,
            cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
            cMapPacked: true
          });
        }
      }

      const doc = await loadingTask.promise;
      setPdfDoc(doc);
      const total = doc.numPages || 223;
      setTotalPages(total);
      setCurrentPage(prev => (prev > total ? total : prev < 1 ? 1 : prev));
      setIsLoadingPdf(false);
      setDownloadProgressText('');
    } catch (err: any) {
      console.error('[BookReader] Error cargando libro con PDF.js:', err);
      setPdfError('No se pudo cargar el libro digital. Por favor, verifica tu conexión o reintenta.');
      setIsLoadingPdf(false);
      setDownloadProgressText('');
    }
  }, [pdfUrl]);

  useEffect(() => {
    loadBook();
  }, [loadBook]);

  // Renderizar página individual en modo "Ojear"
  const renderSinglePage = useCallback(async (pageNum: number) => {
    if (!pdfDoc || !canvasRef.current) return;
    setIsRenderingPage(true);

    try {
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }

      const page = await pdfDoc.getPage(pageNum);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const baseViewport = page.getViewport({ scale: 1.0 });
      const containerWidth = viewerContainerRef.current 
        ? viewerContainerRef.current.clientWidth - 32 
        : window.innerWidth - 48;

      const targetWidth = Math.min(containerWidth, 800);
      const scale = Math.min(2.5, Math.max(0.6, (targetWidth / baseViewport.width) * zoomScale));
      const viewport = page.getViewport({ scale });

      const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const renderContext = {
        canvasContext: ctx,
        viewport
      };

      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;
      await renderTask.promise;
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.warn('[BookReader] Error renderizando página:', err);
      }
    } finally {
      setIsRenderingPage(false);
    }
  }, [pdfDoc, zoomScale]);

  // Renderizar páginas continuas en elementos <canvas> apilados verticalmente
  const renderContinuousPages = useCallback(async () => {
    if (!pdfDoc || !viewerContainerRef.current || displayMode !== 'continuous') return;

    const container = viewerContainerRef.current;
    container.innerHTML = '';
    renderedContinuousPagesRef.current.clear();

    const total = pdfDoc.numPages || 223;

    for (let i = 1; i <= total; i++) {
      const pageWrapper = document.createElement('div');
      pageWrapper.id = `continuous-page-wrapper-${i}`;
      pageWrapper.className = 'my-4 relative bg-white shadow-xl rounded-xl overflow-hidden flex flex-col items-center select-none';
      pageWrapper.style.maxWidth = '800px';
      pageWrapper.style.width = '100%';

      const pageCanvas = document.createElement('canvas');
      pageCanvas.id = `continuous-canvas-${i}`;
      pageCanvas.className = 'block max-w-full h-auto pointer-events-none select-none';

      const pageLabel = document.createElement('div');
      pageLabel.className = 'text-[11px] font-mono font-bold text-slate-400 py-1 bg-slate-50 w-full text-center border-t border-slate-100';
      pageLabel.textContent = `Página ${i} de ${total}`;

      pageWrapper.appendChild(pageCanvas);
      pageWrapper.appendChild(pageLabel);
      container.appendChild(pageWrapper);

      // Renderizar la página
      try {
        const page = await pdfDoc.getPage(i);
        const ctx = pageCanvas.getContext('2d');
        if (ctx) {
          const baseViewport = page.getViewport({ scale: 1.0 });
          const containerWidth = container.clientWidth - 32;
          const targetWidth = Math.min(containerWidth, 800);
          const scale = Math.min(2.5, Math.max(0.6, (targetWidth / baseViewport.width) * zoomScale));
          const viewport = page.getViewport({ scale });

          const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
          pageCanvas.width = Math.floor(viewport.width * dpr);
          pageCanvas.height = Math.floor(viewport.height * dpr);
          pageCanvas.style.width = `${Math.floor(viewport.width)}px`;
          pageCanvas.style.height = `${Math.floor(viewport.height)}px`;

          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          await page.render({ canvasContext: ctx, viewport }).promise;
        }
      } catch (err) {
        console.warn(`[BookReader] Error renderizando página continua ${i}:`, err);
      }
    }
  }, [pdfDoc, displayMode, zoomScale]);

  // Actualizar vista según modo
  useEffect(() => {
    if (pdfDoc) {
      if (displayMode === 'interactive') {
        renderSinglePage(currentPage);
      } else {
        renderContinuousPages();
      }
    }
  }, [pdfDoc, displayMode, currentPage, zoomScale, renderSinglePage, renderContinuousPages]);

  // Navegación de páginas en modo "Ojear"
  const goToNextPage = () => {
    if (currentPage < totalPages && !isRenderingPage) {
      setCurrentPage(p => p + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1 && !isRenderingPage) {
      setCurrentPage(p => p - 1);
    }
  };

  // Guardar libro offline en IndexedDB ("bmc_pdf_offline")
  const handleSavePdfOffline = async () => {
    try {
      setIsSavingOffline(true);
      setDownloadProgressText('Descargando archivo binario en memoria...');

      // Obtener el binario del PDF eludiendo CORS mediante Firebase Storage SDK / XHR
      const arrayBuffer = await fetchPdfBinary(pdfUrl || undefined);
      setDownloadProgressText('Guardando en IndexedDB (bmc_pdf_offline)...');

      await savePdfOffline(arrayBuffer);
      setIsOfflineSaved(true);
    } catch (err: any) {
      console.warn('[BookReader] Error guardando PDF offline:', err);
      alert('No se pudo guardar el libro para leer sin conexión. Por favor reintenta.');
    } finally {
      setIsSavingOffline(false);
      setDownloadProgressText('');
    }
  };

  const handleDeletePdfOffline = async () => {
    try {
      await deleteOfflinePdf();
      setIsOfflineSaved(false);
    } catch (err) {
      console.warn('[BookReader] Error eliminando PDF offline:', err);
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
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* BARRA SUPERIOR DEL VISOR */}
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
                <span>Oficial</span>
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
              Libro Digital &bull; Por Robert Pacheco
            </p>
          </div>
        </div>

        {/* Acciones y Botones de Control */}
        <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 flex-wrap">
          
          {/* Botón: 📥 Descargar Libro Offline */}
          {isOfflineSaved ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>✅ Libro guardado offline</span>
              <button
                type="button"
                onClick={handleDeletePdfOffline}
                className="text-slate-400 hover:text-red-500 ml-1 p-0.5 rounded transition cursor-pointer"
                title="Eliminar libro de la memoria del dispositivo"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : isSavingOffline ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#7c3aed]/10 text-[#7c3aed] border border-[#7c3aed]/20 text-xs font-bold">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Guardando en memoria segura...</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSavePdfOffline}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-bold shadow-md shadow-[#7c3aed]/25 transition active:scale-95 cursor-pointer"
              title="Guarda el libro completo en IndexedDB para leerlo sin conexión a internet"
            >
              <Download className="w-3.5 h-3.5" />
              <span>📥 Descargar Libro Offline</span>
            </button>
          )}

          {/* Selector de Modo: Ojear vs Continuo */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setDisplayMode('interactive')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition ${
                displayMode === 'interactive'
                  ? 'bg-white text-[#7c3aed] shadow-xs font-black'
                  : 'text-slate-600 hover:text-[#0f2147]'
              }`}
              title="Ojear página por página"
            >
              <BookMarked className="w-3.5 h-3.5" />
              <span>Ojear</span>
            </button>

            <button
              type="button"
              onClick={() => setDisplayMode('continuous')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition ${
                displayMode === 'continuous'
                  ? 'bg-white text-[#7c3aed] shadow-xs font-black'
                  : 'text-slate-600 hover:text-[#0f2147]'
              }`}
              title="Lectura continua con scroll vertical"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Continuo</span>
            </button>
          </div>

          {/* Zoom */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
            <button 
              type="button"
              onClick={() => setZoomScale(z => Math.max(z - 0.15, 0.75))} 
              className="p-1.5 rounded-lg hover:bg-white text-slate-600 transition" 
              title="Reducir"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button 
              type="button"
              onClick={() => setZoomScale(1.0)} 
              className="px-1.5 text-[11px] font-mono font-bold text-slate-700" 
              title="Restablecer"
            >
              {Math.round(zoomScale * 100)}%
            </button>
            <button 
              type="button"
              onClick={() => setZoomScale(z => Math.min(z + 0.15, 2.0))} 
              className="p-1.5 rounded-lg hover:bg-white text-slate-600 transition" 
              title="Aumentar"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Recargar */}
          <button
            type="button"
            onClick={loadBook}
            className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 transition shadow-xs"
            title="Recargar libro"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPdf ? 'animate-spin text-[#7c3aed]' : ''}`} />
          </button>

          {/* Pantalla Completa */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
            title="Pantalla completa"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>

      </div>

      {/* ÁREA PRINCIPAL DEL VISOR INCORPORADO CON PDF.JS */}
      <div 
        id="pdf-viewer-container" 
        className="w-full h-[70vh] overflow-y-auto flex flex-col items-center bg-[#070f1b] rounded-xl p-2 relative select-none"
      >
        {isLoadingPdf ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-white my-auto">
            <Loader2 className="w-8 h-8 text-[#7c3aed] animate-spin mb-3" />
            <h3 className="font-heading text-base font-bold text-white mb-1">
              Abriendo el libro digital con PDF.js...
            </h3>
            <p className="text-xs text-slate-400">
              {downloadProgressText || 'Renderizando lienzos oficiales...'}
            </p>
          </div>
        ) : pdfError ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-white my-auto">
            <div className="w-12 h-12 rounded-full p-2 bg-red-500/20 text-red-400 flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="font-heading text-base font-bold text-white mb-1">
              No se pudo abrir el libro
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mb-4">
              {pdfError}
            </p>
            <button
              type="button"
              onClick={loadBook}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7c3aed] text-white text-xs font-bold hover:bg-[#6d28d9] transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reintentar</span>
            </button>
          </div>
        ) : displayMode === 'interactive' ? (
          /* MODO OJEAR: MUESTRA ÚNICAMENTE UN CANVAS CON LA PÁGINA ACTUAL */
          <div className="flex-1 flex flex-col items-center justify-center w-full h-full relative">
            <div className="relative bg-white shadow-2xl rounded-xl overflow-hidden my-auto border border-white/10">
              {isRenderingPage && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center z-10">
                  <Loader2 className="w-6 h-6 text-[#7c3aed] animate-spin" />
                </div>
              )}
              <canvas 
                ref={canvasRef} 
                className="block mx-auto max-w-full h-auto select-none pointer-events-none"
              />
            </div>

            {/* Controles Flotantes para Navegación en Ojear: Botones Grandes */}
            <div className="sticky bottom-2 mt-4 px-4 sm:px-6 py-2.5 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-white/10 flex items-center gap-4 sm:gap-6 shadow-2xl z-20">
              <button
                type="button"
                onClick={goToPrevPage}
                disabled={currentPage <= 1 || isRenderingPage}
                className="px-4 sm:px-5 py-2.5 rounded-xl bg-white/10 hover:bg-[#7c3aed] text-white text-xs sm:text-sm font-bold transition disabled:opacity-30 disabled:pointer-events-none active:scale-95 cursor-pointer shadow-sm"
                title="Página anterior"
              >
                ◀ Anterior
              </button>

              <span className="text-xs sm:text-sm font-mono font-bold text-white px-2 whitespace-nowrap">
                Página {currentPage} de {totalPages || 223}
              </span>

              <button
                type="button"
                onClick={goToNextPage}
                disabled={currentPage >= totalPages || isRenderingPage}
                className="px-4 sm:px-5 py-2.5 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs sm:text-sm font-bold transition disabled:opacity-30 disabled:pointer-events-none active:scale-95 cursor-pointer shadow-md shadow-[#7c3aed]/30"
                title="Página siguiente"
              >
                Siguiente ▶
              </button>
            </div>
          </div>
        ) : (
          /* MODO CONTINUO: CONTENEDOR CON TODAS LAS PÁGINAS RENDERIZADAS EN CANVAS */
          <div 
            ref={viewerContainerRef} 
            className="w-full flex flex-col items-center space-y-4 py-2"
          />
        )}
      </div>

    </div>
  );
};
