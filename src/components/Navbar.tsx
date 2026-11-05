import React, { useState, useEffect } from 'react';
import { 
  BookMarked,
  Headphones, 
  BookOpen, 
  Bookmark, 
  BookmarkCheck,
  Maximize2, 
  Minimize2, 
  LogOut, 
  ShieldCheck,
  WifiOff
} from 'lucide-react';
import { UserProfile } from '../types';
import { useOnlineStatus } from '../hooks/usePWAInstall';

interface NavbarProps {
  user: UserProfile;
  activeTab: 'audio' | 'book';
  onTabChange: (tab: 'audio' | 'book') => void;
  onLogout: () => void;
  licenseCode?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  onTabChange,
  onLogout
}) => {
  const isOnline = useOnlineStatus();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkedPage, setBookmarkedPage] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem('bmc_pagina_marcada_libro');
      return saved ? parseInt(saved, 10) : null;
    } catch {
      return null;
    }
  });

  // Escuchar estado de pantalla completa
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Escuchar actualizaciones de marcador desde el visor de PDF
  useEffect(() => {
    const handleBookmarkStatus = (e: any) => {
      if (e.detail) {
        setIsBookmarked(Boolean(e.detail.isCurrentPageBookmarked));
        if (typeof e.detail.bookmarkedPage === 'number') {
          setBookmarkedPage(e.detail.bookmarkedPage);
        }
      }
    };
    window.addEventListener('bmc-bookmark-status', handleBookmarkStatus);
    return () => window.removeEventListener('bmc-bookmark-status', handleBookmarkStatus);
  }, []);

  // Alternar pantalla completa
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Disparar acción de marcador hacia el visor de lectura
  const handleBookmarkClick = () => {
    if (activeTab !== 'book') {
      onTabChange('book');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('bmc-bookmark-trigger'));
      }, 100);
    } else {
      window.dispatchEvent(new CustomEvent('bmc-bookmark-trigger'));
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 shadow-xs">
      <div className="max-w-4xl mx-auto px-2 sm:px-4 h-13 sm:h-14 flex items-center justify-center">
        
        {/* BARRA SUPERIOR DE ICONOS (DE IZQUIERDA A DERECHA, LIMPIOS SIN TEXTOS) */}
        <div className="inline-flex items-center gap-1.5 sm:gap-3 p-1 rounded-2xl bg-slate-100/80 border border-slate-200/70 shadow-inner">
          
          {/* 1) Icono de separador */}
          <div 
            className="p-2 rounded-xl text-amber-500 hover:text-amber-600 transition flex items-center justify-center cursor-default"
            title="Separador de lectura"
            aria-label="Separador"
          >
            <BookMarked className="w-5 h-5" />
          </div>

          <div className="h-4 w-px bg-slate-300/80 mx-0.5" aria-hidden="true" />

          {/* 2) Icono de audiolibro */}
          <button
            type="button"
            onClick={() => onTabChange('audio')}
            className={`p-2 rounded-xl transition-all cursor-pointer active:scale-95 flex items-center justify-center ${
              activeTab === 'audio'
                ? 'bg-[#7c3aed] text-white shadow-md shadow-[#7c3aed]/30 ring-2 ring-[#7c3aed]/20'
                : 'text-slate-600 hover:text-[#0f2147] hover:bg-white/80'
            }`}
            title="Audiolibro"
            aria-label="Audiolibro"
          >
            <Headphones className="w-5 h-5" />
          </button>

          {/* 3) Icono de libro digital */}
          <button
            type="button"
            onClick={() => onTabChange('book')}
            className={`p-2 rounded-xl transition-all cursor-pointer active:scale-95 flex items-center justify-center ${
              activeTab === 'book'
                ? 'bg-[#7c3aed] text-white shadow-md shadow-[#7c3aed]/30 ring-2 ring-[#7c3aed]/20'
                : 'text-slate-600 hover:text-[#0f2147] hover:bg-white/80'
            }`}
            title="Libro Digital"
            aria-label="Libro Digital"
          >
            <BookOpen className="w-5 h-5" />
          </button>

          {/* 4) Icono de marcador (bookmark) */}
          <button
            type="button"
            onClick={handleBookmarkClick}
            className={`relative p-2 rounded-xl transition-all cursor-pointer active:scale-95 flex items-center justify-center ${
              isBookmarked
                ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-400/40'
                : 'text-slate-600 hover:text-amber-600 hover:bg-white/80'
            }`}
            title={
              isBookmarked
                ? `Página marcada en tu separador`
                : `Guardar página actual como marcador`
            }
            aria-label="Marcador"
          >
            {isBookmarked ? (
              <BookmarkCheck className="w-5 h-5 text-white fill-white" />
            ) : (
              <Bookmark className="w-5 h-5" />
            )}
            {bookmarkedPage !== null && (
              <span className="absolute -bottom-1 -right-1 text-[8px] font-black px-1 rounded-full bg-amber-800 text-white border border-white">
                {bookmarkedPage}
              </span>
            )}
          </button>

          {/* 5) Icono de maximizar pantalla */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl text-slate-600 hover:text-[#0f2147] hover:bg-white/80 transition-all cursor-pointer active:scale-95 flex items-center justify-center"
            title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
            aria-label="Pantalla completa"
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5 text-[#7c3aed]" />
            ) : (
              <Maximize2 className="w-5 h-5" />
            )}
          </button>

          {/* 6) Círculo de perfil con la letra "J" */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-8 h-8 rounded-full bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-black text-xs flex items-center justify-center shadow-md shadow-[#7c3aed]/30 border-2 border-white transition-all cursor-pointer active:scale-95"
              title="Perfil de Usuario"
              aria-label="Perfil"
            >
              J
            </button>

            {/* Dropdown del Menú de Usuario */}
            {showProfileMenu && (
              <div 
                className="absolute right-0 mt-2 w-60 rounded-2xl bg-white border border-slate-100 shadow-2xl p-4 text-left z-50 animate-in fade-in zoom-in-95"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-full bg-[#7c3aed] text-white font-black flex items-center justify-center text-xs shadow">
                    J
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-[#0f2147] truncate">
                      {user.displayName || 'Lector'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate" title={user.email}>
                      {user.email}
                    </p>
                  </div>
                </div>

                <div className="py-2.5 text-xs space-y-1 border-b border-slate-100">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1.5 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Acceso:
                    </span>
                    <span className="text-[#7c3aed] font-bold">Oficial Completo</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Audiolibro 113 Capítulos + Libro Digital
                  </p>
                  {!isOnline && (
                    <div className="flex items-center gap-1 text-amber-700 text-[10px] font-bold pt-1">
                      <WifiOff className="w-3 h-3 text-amber-600" />
                      <span>Modo sin conexión activo</span>
                    </div>
                  )}
                </div>

                <div className="pt-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};
