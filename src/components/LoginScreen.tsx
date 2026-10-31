import React, { useState } from 'react';
import { 
  Download, 
  ArrowRight, 
  Headphones, 
  BookOpen, 
  ShieldCheck, 
  Share2,
  X
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface LoginScreenProps {
  onLogin: () => Promise<void>;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      await onLogin();
    } catch (err: any) {
      console.warn('[Login] Aviso de inicio de sesión:', err?.message || err);
      if (err?.code === 'auth/popup-closed-by-user') {
        setLoginError('Se canceló el inicio de sesión con Google.');
      } else {
        setLoginError(err?.message || 'No se pudo iniciar sesión con Google. Por favor, intenta de nuevo.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen text-[#0f2147] flex flex-col justify-between selection:bg-[#7c3aed]/20 selection:text-[#7c3aed] relative overflow-hidden">
      
      {/* Elementos decorativos de fondo */}
      <div className="absolute top-10 left-10 w-80 h-80 bg-white/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#7c3aed]/20 rounded-full blur-3xl pointer-events-none" />

      {/* Encabezado con logo.png y acciones */}
      <header className="relative z-10 max-w-6xl mx-auto w-full px-4 sm:px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Logo 101 Buenos Malos Consejos"
            className="w-12 h-12 rounded-full object-cover shadow-lg border-2 border-white/80"
          />
          <div>
            <span className="font-heading font-black text-sm tracking-tight text-white uppercase block leading-tight drop-shadow-sm">
              101 BUENOS MALOS CONSEJOS
            </span>
            <span className="text-[11px] text-white/90 font-medium italic">
              Por Robert Pacheco
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isInstalled && isInstallable && (
            <button
              onClick={install}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/25 hover:bg-white/35 text-white border border-white/40 text-xs font-bold transition shadow-sm backdrop-blur-md"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Instalar App</span>
            </button>
          )}

          {!isInstalled && isIOS && (
            <button
              onClick={() => setShowIOSModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/25 hover:bg-white/35 text-white border border-white/40 text-xs font-bold transition shadow-sm backdrop-blur-md"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Instalar PWA</span>
            </button>
          )}
        </div>
      </header>

      {/* Contenido Hero Principal */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 py-6 sm:py-12 flex-1 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-14">
        
        {/* Columna Izquierda: Título y Branding Oficial */}
        <div className="flex-1 text-center lg:text-left max-w-xl">
          
          {/* Badge o Etiqueta Superior */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-white/80 text-[#0f2147] text-xs font-extrabold tracking-wide shadow-md mb-6">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>&bull; FEN&Oacute;MENO VIRAL &bull; +30M VISTAS EN REDES</span>
          </div>

          {/* Gran Título Oficial */}
          <div className="mb-4">
            <div className="font-serif-impact text-7xl sm:text-8xl lg:text-9xl font-black text-white leading-none tracking-tight drop-shadow-[0_4px_24px_rgba(124,58,237,0.45)]">
              101
            </div>

            <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-black text-[#0f2147] tracking-tight uppercase leading-[1.1] mt-1 drop-shadow-sm">
              BUENOS MALOS CONSEJOS
            </h1>

            <div className="font-heading text-2xl sm:text-3xl lg:text-4xl font-black text-[#7c3aed] tracking-tight uppercase leading-snug drop-shadow-sm mt-0.5">
              PARA MI HIJO
            </div>

            <p className="font-serif italic text-xl sm:text-2xl text-[#0f2147] font-semibold mt-2">
              Por Robert Pacheco
            </p>
          </div>

          <p className="text-sm sm:text-base text-white/95 font-medium leading-relaxed max-w-lg mb-8 drop-shadow-sm">
            El libro y audiolibro que revolucionó las redes sociales con más de 30 millones de reproducciones. Reflexiones sin filtro, ironías lúcidas y lecciones que nadie se atreve a decirte.
          </p>

          {/* Tarjetas informativas en glassmorphism */}
          <div className="grid grid-cols-2 gap-3 text-left">
            <div className="p-3.5 rounded-2xl bg-white/85 backdrop-blur-md border border-white shadow-md flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#7c3aed]/15 text-[#7c3aed]">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black text-[#0f2147]">Audiolibro Oficial</p>
                <p className="text-[11px] text-slate-500">Narración completa</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/85 backdrop-blur-md border border-white shadow-md flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#f97316]/15 text-[#f97316]">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black text-[#0f2147]">Libro Digital</p>
                <p className="text-[11px] text-slate-500">Lector interactivo</p>
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Tarjeta de Acceso Blanca Glassmorphism con logo.png */}
        <div className="w-full max-w-sm sm:max-w-md">
          <div className="glass-card rounded-3xl p-8 sm:p-10 text-center relative overflow-hidden">
            
            {/* Glow decorativo sutil en la tarjeta */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-[#7c3aed]/10 rounded-full blur-2xl pointer-events-none" />

            {/* Arte del Personaje con logo.png */}
            <div className="mx-auto mb-5 flex justify-center">
              <div className="relative p-1.5 rounded-full bg-gradient-to-tr from-[#7c3aed] to-[#4f96fe] shadow-xl">
                <img
                  src="/logo.png"
                  alt="101 Buenos Malos Consejos Para Mi Hijo"
                  className="w-32 h-32 sm:w-36 sm:h-36 rounded-full object-cover border-2 border-white shadow-inner"
                />
              </div>
            </div>

            <h2 className="font-heading text-2xl font-black text-[#0f2147] mb-2">
              Acceso al Combo Oficial
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-7">
              Inicia sesión con tu cuenta de Google para acceder a tu Combo: Audiolibro &amp; Libro Digital o activar tu código de compra.
            </p>

            {/* Botón "Continuar con Google" limpio */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoggingIn}
              className="w-full py-4 px-6 rounded-2xl bg-white hover:bg-slate-50 text-[#0f2147] font-black text-sm shadow-lg border border-slate-200/80 flex items-center justify-center gap-3 transition-all duration-200 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none group"
            >
              {isLoggingIn ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-[#7c3aed] border-t-transparent rounded-full animate-spin" />
                  <span>Conectando con Google...</span>
                </span>
              ) : (
                <>
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continuar con Google</span>
                  <ArrowRight className="w-4 h-4 text-[#7c3aed] group-hover:translate-x-1 transition-transform ml-auto" />
                </>
              )}
            </button>

            {loginError && (
              <p className="mt-4 text-xs text-red-600 bg-red-50 p-3 rounded-xl border border-red-200 text-left font-medium">
                {loginError}
              </p>
            )}

            <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-500 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Acceso seguro protegido contra descargas</span>
            </div>

          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/20 py-5 text-center text-xs text-white/90 font-medium">
        <p>
          &copy; {new Date().getFullYear()} "101 Buenos Malos Consejos Para Mi Hijo" &middot; Por Robert Pacheco. Todos los derechos reservados.
        </p>
      </footer>



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

    </div>
  );
};
