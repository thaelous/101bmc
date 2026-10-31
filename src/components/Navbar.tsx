import React, { useState } from 'react';
import { 
  BookOpen, 
  Headphones, 
  Download, 
  LogOut, 
  WifiOff, 
  ShieldCheck, 
  Share2,
  X
} from 'lucide-react';
import { UserProfile } from '../types';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWAInstall';

interface NavbarProps {
  user: UserProfile;
  activeTab: 'book' | 'audio';
  onTabChange: (tab: 'book' | 'audio') => void;
  onLogout: () => void;
  licenseCode?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  onTabChange,
  onLogout,
  licenseCode
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-white/60 shadow-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          
          {/* Logo y Marca Oficial de buenosmalosconsejos.com */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onTabChange('audio')}>
            <img
              src="/logo.png"
              alt="Logo 101 Buenos Malos Consejos"
              className="w-11 h-11 rounded-full object-cover shadow-md border-2 border-white flex-shrink-0"
            />
            
            <div className="hidden sm:block">
              <h1 className="font-heading font-black text-sm tracking-tight text-[#0f2147] uppercase leading-tight">
                101 BUENOS MALOS CONSEJOS <span className="text-[#7c3aed]">PARA MI HIJO</span>
              </h1>
              <p className="text-[11px] text-[#0f2147]/80 font-medium italic">
                Por Robert Pacheco
              </p>
            </div>
          </div>

          {/* Selector de Pestañas: Audiolibro y Libro */}
          <nav className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/70 border border-white/90 shadow-inner">
            <button
              onClick={() => onTabChange('audio')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 ${
                activeTab === 'audio'
                  ? 'bg-[#7c3aed] text-white shadow-md shadow-[#7c3aed]/30'
                  : 'text-[#0f2147] hover:bg-white/80'
              }`}
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>Audiolibro</span>
            </button>

            <button
              onClick={() => onTabChange('book')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 ${
                activeTab === 'book'
                  ? 'bg-[#7c3aed] text-white shadow-md shadow-[#7c3aed]/30'
                  : 'text-[#0f2147] hover:bg-white/80'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Libro Digital</span>
            </button>
          </nav>

          {/* Acciones Derecha */}
          <div className="flex items-center gap-2">
            
            {/* Indicador Offline */}
            {!isOnline && (
              <div 
                title="Modo sin conexión"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-800 text-[11px] font-bold"
              >
                <WifiOff className="w-3.5 h-3.5 animate-pulse text-amber-600" />
                <span className="hidden md:inline">Sin Conexión</span>
              </div>
            )}

            {/* Botón PWA Instalable */}
            {!isInstalled && isInstallable && (
              <button
                onClick={install}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#f97316] to-[#ea580c] hover:opacity-95 text-white text-xs font-bold shadow-md shadow-[#f97316]/30 transition"
                title="Instalar en tu dispositivo"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Instalar App</span>
              </button>
            )}

            {!isInstalled && isIOS && (
              <button
                onClick={() => setShowIOSModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#f97316] to-[#ea580c] hover:opacity-95 text-white text-xs font-bold shadow-md shadow-[#f97316]/30 transition"
                title="Instalar en iOS"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Instalar PWA</span>
              </button>
            )}

            {/* Menú de Usuario */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 p-1 rounded-2xl bg-white/80 border border-white hover:border-[#7c3aed] shadow-sm transition"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Usuario'}
                    className="w-8 h-8 rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-[#7c3aed] text-white font-bold flex items-center justify-center text-xs">
                    {(user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
              </button>

              {/* Dropdown del Usuario */}
              {showProfileMenu && (
                <div 
                  className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-slate-100 shadow-2xl p-4 text-left z-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="" className="w-9 h-9 rounded-xl" />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-[#7c3aed] text-white font-bold flex items-center justify-center">
                        {(user.email || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-[#0f2147] truncate">
                        {user.displayName || 'Lector'}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate" title={user.email}>
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <div className="py-3 text-xs space-y-2 border-b border-slate-100">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Acceso:
                      </span>
                      <span className="text-[#7c3aed] font-bold">Combo Desbloqueado</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Audiolibro + Libro Digital activos
                    </p>
                  </div>

                  <div className="pt-3">
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        onLogout();
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition"
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

      {/* Modal iOS */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl relative text-center">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-heading text-lg font-black text-[#0f2147] mb-2">Instalar en tu iPhone o iPad</h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              1. Toca el botón <strong>Compartir</strong> <Share2 className="w-3.5 h-3.5 inline mx-1 text-[#7c3aed]" /> en Safari.<br />
              2. Elige <strong>"Agregar al inicio"</strong>.<br />
              3. ¡Listo! Accede como app nativa.
            </p>
            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#7c3aed] text-white font-bold text-xs uppercase shadow-md shadow-[#7c3aed]/30"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
