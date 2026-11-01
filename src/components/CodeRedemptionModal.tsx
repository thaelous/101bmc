import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  AlertCircle, 
  LogOut, 
  CheckCircle2, 
  Headphones,
  BookOpen,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { UserProfile, CodigoDocument } from '../types';
import { redeemAccessCode } from '../firebase/config';

interface CodeRedemptionModalProps {
  user: UserProfile;
  onCodeRedeemed: (license: CodigoDocument) => void;
  onLogout: () => void;
}

export const CodeRedemptionModal: React.FC<CodeRedemptionModalProps> = ({
  user,
  onCodeRedeemed,
  onLogout
}) => {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleRedeem = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!code.trim()) {
      setErrorMessage('Por favor ingresa tu código de acceso.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await redeemAccessCode(code, user.email);

      if (result.success && result.license) {
        setSuccessMessage('¡Código verificado con éxito! Desbloqueando combo completo (Audiolibro y Libro Digital)...');
        
        confetti({
          particleCount: 110,
          spread: 75,
          origin: { y: 0.6 },
          colors: ['#7c3aed', '#4f96fe', '#f97316', '#ffffff']
        });

        setTimeout(() => {
          onCodeRedeemed(result.license!);
        }, 1200);
      } else {
        setErrorMessage(result.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al validar el código.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-md rounded-3xl glass-card p-6 sm:p-9 text-center relative overflow-hidden">
        
        {/* Glow decorativo morado */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-60 h-60 bg-[#7c3aed]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Emblema con logo.png */}
        <div className="mx-auto mb-4 flex justify-center">
          <div className="relative p-1 rounded-full bg-gradient-to-tr from-[#7c3aed] to-[#4f96fe] shadow-lg">
            <img
              src="/logo.png"
              alt="Logo"
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-white"
            />
          </div>
        </div>

        {/* Título Oficial Combo */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#7c3aed]/10 text-[#7c3aed] text-[10px] font-extrabold uppercase tracking-wider mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Primera vez con esta cuenta</span>
        </div>
        <h2 className="font-heading text-xl sm:text-2xl font-black text-[#0f2147] tracking-tight mb-1">
          Activa tu Código de Acceso
        </h2>
        <p className="text-xs text-slate-500 font-medium mb-5">
          Ingresa tu código oficial de compra para registrarlo a tu nombre y desbloquear el audiolibro y libro digital.
        </p>

        {/* Usuario Google conectado */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-left mb-6">
          <div className="flex items-center gap-2.5 overflow-hidden">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-300" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#7c3aed] text-white font-bold flex items-center justify-center text-xs">
                {(user.email || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-[#0f2147] truncate">
                {user.displayName || 'Lector'}
              </p>
              <p className="text-[11px] text-slate-500 truncate font-mono">
                {user.email}
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-red-600 px-2.5 py-1 rounded-lg hover:bg-white transition flex-shrink-0 font-medium"
            title="Cambiar cuenta de Google"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cambiar</span>
          </button>
        </div>

        {/* Formulario Limpio: Ingresa tu código de acceso */}
        <form onSubmit={handleRedeem} className="space-y-4">
          <div className="text-left">
            <label className="block text-xs font-bold text-[#0f2147] uppercase tracking-wider mb-2">
              Ingresa tu código de acceso
            </label>
            <div className="relative">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="EJ: CONSEJO-101-GOLD"
                disabled={isLoading || !!successMessage}
                autoFocus
                className="w-full px-4 py-3.5 rounded-2xl bg-white border-2 border-slate-200 focus:border-[#7c3aed] focus:ring-4 focus:ring-[#7c3aed]/10 focus:outline-none text-center font-mono font-bold text-[#0f2147] text-base tracking-widest uppercase placeholder:text-slate-400 transition shadow-sm"
              />
            </div>
          </div>

          {/* Mensajes de error o éxito */}
          {errorMessage && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs text-left font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs text-left font-medium">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Botón Púrpura: Desbloquear Combo completo */}
          <button
            type="submit"
            disabled={isLoading || !code.trim() || !!successMessage}
            className="w-full py-4 rounded-2xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-[#7c3aed]/40 active:scale-[0.99] transition disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Verificando combo...</span>
              </span>
            ) : successMessage ? (
              <span className="flex items-center gap-2">
                <Headphones className="w-4 h-4" />
                <BookOpen className="w-4 h-4" />
                <span>¡Combo Desbloqueado!</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Headphones className="w-4 h-4" />
                <BookOpen className="w-4 h-4" />
                <span>Desbloquear Combo completo</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </span>
            )}
          </button>
        </form>

        <p className="mt-5 text-[11px] text-slate-500 font-medium leading-relaxed">
          Al validar tu código se desbloquearán de inmediato el <strong className="text-[#0f2147]">audiolibro narrado completo</strong> y el <strong className="text-[#0f2147]">visor interactivo del libro digital</strong> en tu cuenta.
        </p>

      </div>
    </div>
  );
};
