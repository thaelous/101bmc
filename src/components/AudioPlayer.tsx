import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Clock, 
  ListMusic, 
  Headphones, 
  Search, 
  X, 
  Loader2, 
  Music,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Download,
  CheckCircle2,
  WifiOff,
  Trash2
} from 'lucide-react';
import { Chapter, AudioTrackItem } from '../types';
import { 
  fetchAudiolibroTracksFromStorage, 
  getChapterAudioDownloadUrl,
  generateDefault113Tracks 
} from '../firebase/config';
import {
  isChapterOfflineAvailable,
  getAllOfflineChapterNumbers,
  saveChapterForOffline,
  getDecryptedChapterAudioUrl,
  deleteOfflineChapter
} from '../services/offlineAudioVault';

interface AudioPlayerProps {
  chapters?: Chapter[];
  currentChapterIndex?: number;
  onChapterSelect?: (index: number) => void;
  userEmail: string;
  isSideBySide?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  currentChapterIndex = 0,
  onChapterSelect,
  userEmail,
  isSideBySide = false
}) => {
  // Pistas dinámicas con títulos oficiales de Robert Pacheco (1 a 113)
  const [tracks, setTracks] = useState<AudioTrackItem[]>(() => generateDefault113Tracks());
  const [activeTrackIndex, setActiveTrackIndex] = useState(currentChapterIndex);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [isLoadingAudioUrl, setIsLoadingAudioUrl] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Estados del reproductor
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);

  // Lista interactiva y búsqueda
  const [showChapterDrawer, setShowChapterDrawer] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null);

  // Estados para modo offline y cifrado local en navegador
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [offlineChapterNumbers, setOfflineChapterNumbers] = useState<Set<number>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeBlobUrlRef = useRef<string | null>(null);
  const timerIntervalRef = useRef<any>(null);

  // Escuchar cambios de conectividad (Online / Offline)
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Cargar índice de capítulos guardados offline al inicializar
  useEffect(() => {
    let isMounted = true;
    getAllOfflineChapterNumbers()
      .then((numbers) => {
        if (isMounted) {
          setOfflineChapterNumbers(new Set(numbers));
        }
      })
      .catch((err) => {
        console.warn('[AudioPlayer] Error al cargar capítulos offline:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Limpiar blob URL al desmontar componente
  useEffect(() => {
    return () => {
      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
        activeBlobUrlRef.current = null;
      }
    };
  }, []);

  // Cargar lista dinámica desde Firebase Storage al iniciar y combinar con títulos de Robert Pacheco
  useEffect(() => {
    let isMounted = true;
    setIsLoadingTracks(true);

    fetchAudiolibroTracksFromStorage()
      .then((loadedTracks) => {
        if (isMounted && loadedTracks && loadedTracks.length > 0) {
          setTracks(loadedTracks);
        }
      })
      .catch((err) => {
        console.warn('[AudioPlayer] Error al cargar pistas desde Storage:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingTracks(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const currentTrack = tracks[activeTrackIndex] || tracks[0];

  // Sincronizar índice externo si cambia
  useEffect(() => {
    if (typeof currentChapterIndex === 'number' && currentChapterIndex !== activeTrackIndex) {
      if (currentChapterIndex >= 0 && currentChapterIndex < tracks.length) {
        setActiveTrackIndex(currentChapterIndex);
      }
    }
  }, [currentChapterIndex, tracks.length]);

  // Inicializar elemento de audio y suscribir eventos nativos de HTML5 Audio
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'auto';
    }

    const audio = audioRef.current;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      } else {
        setDuration(currentTrack.durationSeconds || 160);
      }
      setIsLoadingAudioUrl(false);
      setAudioError(null);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      if (sleepTimerMinutes === -1) {
        pauseAudio();
        setSleepTimerMinutes(null);
        return;
      }
      handleNextTrack();
    };

    const handleError = () => {
      console.warn(`[AudioPlayer] No se pudo reproducir audio de ${currentTrack.filename}`);
      setIsLoadingAudioUrl(false);
      setIsPlaying(false);
      setAudioError('No se pudo reproducir el audio del capítulo. Comprueba tu conexión a internet.');
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [activeTrackIndex, sleepTimerMinutes, currentTrack]);

  // Cargar URL del capítulo: si está offline descifra el blob de IndexedDB, si está online transmite desde Firebase Storage
  useEffect(() => {
    let isCancelled = false;
    setIsLoadingAudioUrl(true);
    setAudioError(null);
    setCurrentTime(0);

    const loadChapterAudio = async () => {
      try {
        // Liberar URL temporal previa de memoria
        if (activeBlobUrlRef.current) {
          URL.revokeObjectURL(activeBlobUrlRef.current);
          activeBlobUrlRef.current = null;
        }

        let resolvedUrl: string | null = null;
        const isOffline = await isChapterOfflineAvailable(currentTrack.chapterNumber);

        // 1. Si está disponible en el almacén offline cifrado, descifrar al vuelo en memoria
        if (isOffline) {
          resolvedUrl = await getDecryptedChapterAudioUrl(currentTrack.chapterNumber);
          if (resolvedUrl) {
            activeBlobUrlRef.current = resolvedUrl;
          }
        }

        // 2. Si no está guardado offline y hay internet, obtener URL directa de Firebase Storage
        if (!resolvedUrl && navigator.onLine) {
          resolvedUrl = await getChapterAudioDownloadUrl(currentTrack.chapterNumber, currentTrack.filename);
        }

        if (isCancelled) {
          if (resolvedUrl && resolvedUrl.startsWith('blob:')) {
            URL.revokeObjectURL(resolvedUrl);
          }
          return;
        }

        if (resolvedUrl && audioRef.current) {
          audioRef.current.src = resolvedUrl;
          audioRef.current.playbackRate = playbackRate;
          audioRef.current.volume = isMuted ? 0 : volume;

          if (isPlaying) {
            audioRef.current.play()
              .then(() => {
                if (!isCancelled) {
                  setAudioError(null);
                }
              })
              .catch((err) => {
                console.warn('[AudioPlayer] Autoplay suspendido o bloqueado por el navegador:', err);
                if (!isCancelled) {
                  setIsPlaying(false);
                }
              });
          }
        } else {
          if (!isCancelled) {
            if (!navigator.onLine) {
              setAudioError('Sin conexión. Puedes escuchar los capítulos que hayas guardado previamente.');
            } else {
              setAudioError(`El archivo ${currentTrack.filename} no tiene URL de descarga disponible en Firebase Storage.`);
            }
          }
        }
      } catch (err: any) {
        console.warn('[AudioPlayer] Error al resolver fuente de audio:', err);
        if (!isCancelled) {
          setAudioError(navigator.onLine ? `Error al obtener ${currentTrack.filename} desde Firebase Storage.` : 'Sin conexión a internet.');
          setIsPlaying(false);
        }
      } finally {
        if (!isCancelled) setIsLoadingAudioUrl(false);
      }
    };

    loadChapterAudio();

    return () => {
      isCancelled = true;
    };
  }, [activeTrackIndex, currentTrack.chapterNumber, currentTrack.filename]);

  // Manejo del temporizador de apagado
  useEffect(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    if (sleepTimerMinutes && sleepTimerMinutes > 0) {
      setSleepTimerRemaining(sleepTimerMinutes * 60);

      timerIntervalRef.current = setInterval(() => {
        setSleepTimerRemaining(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(timerIntervalRef.current);
            pauseAudio();
            setSleepTimerMinutes(null);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setSleepTimerRemaining(null);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [sleepTimerMinutes]);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const playAudio = async () => {
    setAudioError(null);
    if (!audioRef.current) return;

    // Si aún no tiene src, está vacío o hubo un error previo, resolver URL
    if (!audioRef.current.src || audioRef.current.src === window.location.href || audioError) {
      setIsLoadingAudioUrl(true);
      try {
        let url: string | null = null;
        const isOffline = await isChapterOfflineAvailable(currentTrack.chapterNumber);

        if (isOffline) {
          url = await getDecryptedChapterAudioUrl(currentTrack.chapterNumber);
          if (url) {
            if (activeBlobUrlRef.current) URL.revokeObjectURL(activeBlobUrlRef.current);
            activeBlobUrlRef.current = url;
          }
        }

        if (!url && navigator.onLine) {
          url = await getChapterAudioDownloadUrl(currentTrack.chapterNumber, currentTrack.filename);
        }

        if (url && audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.playbackRate = playbackRate;
          audioRef.current.volume = isMuted ? 0 : volume;
          await audioRef.current.play();
          setIsPlaying(true);
          setAudioError(null);
        } else {
          setAudioError(!navigator.onLine ? 'Sin conexión a internet. Guarda el capítulo para reproducir offline.' : 'No se pudo encontrar el audio del capítulo actual.');
        }
      } catch (err: any) {
        console.warn('[AudioPlayer] Error al reproducir audio mediante getDownloadURL():', err);
        setAudioError('No se pudo cargar el audio. Por favor, intenta de nuevo.');
      } finally {
        setIsLoadingAudioUrl(false);
      }
      return;
    }

    try {
      await audioRef.current.play();
      setIsPlaying(true);
    } catch (err) {
      console.warn('[AudioPlayer] Error al reanudar audio:', err);
      setIsPlaying(false);
      setAudioError('Haz clic en Reproducir para activar el sonido.');
    }
  };

  const handleDownloadOffline = async (chapterNumber: number, title: string, filename: string) => {
    try {
      setIsDownloading(true);
      setDownloadProgress(0);

      const audioUrl = await getChapterAudioDownloadUrl(chapterNumber, filename);
      if (!audioUrl) {
        throw new Error('No se pudo resolver la URL del audio en Firebase Storage.');
      }

      await saveChapterForOffline(chapterNumber, title, filename, audioUrl, (pct) => {
        setDownloadProgress(pct);
      });

      setOfflineChapterNumbers(prev => new Set([...prev, chapterNumber]));
    } catch (err: any) {
      console.warn('[AudioPlayer] Error al guardar capítulo offline:', err);
      setAudioError('No se pudo guardar el capítulo para escuchar sin conexión.');
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  const handleDeleteOffline = async (chapterNumber: number) => {
    try {
      await deleteOfflineChapter(chapterNumber);
      setOfflineChapterNumbers(prev => {
        const next = new Set(prev);
        next.delete(chapterNumber);
        return next;
      });
    } catch (err) {
      console.warn('[AudioPlayer] Error al eliminar audio offline:', err);
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
  };

  const togglePlay = () => {
    if (isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleSkip = (seconds: number) => {
    if (audioRef.current) {
      const newTime = Math.max(0, Math.min(audioRef.current.currentTime + seconds, duration || 160));
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleTrackChange = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < tracks.length) {
      setActiveTrackIndex(newIndex);
      if (onChapterSelect) {
        onChapterSelect(newIndex);
      }
      if (!isPlaying) {
        setIsPlaying(true);
      }
    }
  };

  const handlePrevTrack = () => {
    if (activeTrackIndex > 0) {
      handleTrackChange(activeTrackIndex - 1);
    } else {
      handleSkip(-1000);
    }
  };

  const handleNextTrack = () => {
    if (activeTrackIndex < tracks.length - 1) {
      handleTrackChange(activeTrackIndex + 1);
    }
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      if (audioRef.current) audioRef.current.volume = volume;
    } else {
      setIsMuted(true);
      if (audioRef.current) audioRef.current.volume = 0;
    }
  };

  // Filtrado de capítulos por búsqueda (número, consejo o texto del título)
  const filteredTracks = useMemo(() => {
    if (!searchQuery.trim()) return tracks;
    const q = searchQuery.toLowerCase().trim();
    return tracks.filter(t => 
      t.chapterNumber.toString().includes(q) ||
      t.title.toLowerCase().includes(q) ||
      (t.subtitle && t.subtitle.toLowerCase().includes(q)) ||
      t.filename.toLowerCase().includes(q)
    );
  }, [tracks, searchQuery]);

  return (
    <div 
      className={`${isSideBySide ? 'w-full px-0 py-0' : 'max-w-4xl mx-auto px-4 py-6 sm:py-10'} select-none`}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Tarjeta Central Estilo Celular Moderno */}
      <div className={`mx-auto ${isSideBySide ? 'max-w-md w-full' : 'max-w-sm sm:max-w-md'} rounded-[44px] bg-[#0f2147] p-4 sm:p-5 shadow-[0_25px_60px_-15px_rgba(15,33,71,0.5)] border-4 border-white/60 relative overflow-hidden`}>
        
        {/* Notch / Dynamic Island del Celular */}
        <div className="mx-auto w-28 h-4 rounded-full bg-black/60 mb-3 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-900 mr-2 border border-slate-700" />
          <div className="w-1.5 h-1.5 rounded-full bg-blue-900/60" />
        </div>

        {/* Pantalla del Celular */}
        <div className="rounded-[32px] bg-white p-5 sm:p-7 text-center shadow-inner relative overflow-hidden">
          
          {/* Badge superior del audiolibro con contador */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#7c3aed]/10 text-[#7c3aed] text-[11px] font-extrabold uppercase tracking-wider">
              <Headphones className="w-3.5 h-3.5" />
              <span>Audiolibro Oficial &bull; 113 Capítulos</span>
            </div>

            <div className="flex items-center gap-1.5">
              {!isOnline && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold" title="Sin conexión a internet. Reproduciendo desde memoria local.">
                  <WifiOff className="w-3 h-3 text-amber-600" />
                  <span>Offline</span>
                </span>
              )}

              <button
                onClick={() => setShowChapterDrawer(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-[#7c3aed]/10 text-slate-700 hover:text-[#7c3aed] text-[11px] font-bold transition"
                title="Abrir lista de reproducción completa"
              >
                <ListMusic className="w-3.5 h-3.5" />
                <span>Capítulos</span>
              </button>
            </div>
          </div>

          {/* Arte Central Redondo con logo.png y efecto de disco giratorio */}
          <div className="relative mx-auto my-3 w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
            
            {/* Anillo de audio animado cuando reproduce */}
            <div className={`absolute inset-0 rounded-full border-4 border-dashed border-[#7c3aed]/30 ${isPlaying ? 'animate-[spin_16s_linear_infinite]' : ''}`} />
            
            {/* Imagen del personaje / carátula */}
            <div className={`relative w-40 h-40 sm:w-48 sm:h-48 rounded-full p-1.5 bg-gradient-to-tr from-[#7c3aed] to-[#4f96fe] shadow-xl transition-transform duration-500 ${isPlaying ? 'scale-105' : ''}`}>
              <img
                src="/logo.png"
                alt="101 Buenos Malos Consejos Para Mi Hijo"
                className="w-full h-full rounded-full object-cover border-2 border-white shadow-md"
              />

              {/* Indicador de carga de audio */}
              {isLoadingAudioUrl && (
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-xs">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Título Oficial Limpio */}
          <div className="mt-4">
            <h2 className="font-heading text-lg sm:text-xl font-black text-[#0f2147] tracking-tight leading-snug">
              {currentTrack.title}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Robert Pacheco
            </p>

            {/* Aviso en caso de error de audio con botón de reintento */}
            {audioError && (
              <div className="mt-2.5 p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center justify-between gap-2 text-left">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <span className="truncate">{audioError}</span>
                </div>
                <button
                  onClick={playAudio}
                  className="px-2 py-0.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] flex items-center gap-1 flex-shrink-0"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  <span>Reintentar</span>
                </button>
              </div>
            )}
          </div>

          {/* Barra de Progreso y Tiempo */}
          <div className="mt-4 px-1">
            <div className="relative group">
              <input
                type="range"
                min="0"
                max={duration || 160}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#7c3aed] hover:accent-[#6d28d9] transition"
              />
            </div>
            <div className="flex justify-between items-center text-[11px] font-mono text-slate-500 mt-1.5 font-bold">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration || 160)}</span>
            </div>
          </div>

          {/* Botones de Control Principal */}
          <div className="mt-4 flex items-center justify-center gap-4 sm:gap-6">
            <button
              onClick={handlePrevTrack}
              disabled={activeTrackIndex === 0}
              className="p-2 text-slate-400 hover:text-[#0f2147] transition disabled:opacity-30"
              title="Capítulo anterior"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={() => handleSkip(-15)}
              className="p-2 text-slate-500 hover:text-[#7c3aed] transition"
              title="Retroceder 15s"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            {/* Gran Botón Púrpura Play / Pausa */}
            <button
              onClick={togglePlay}
              className="w-16 h-16 rounded-full bg-[#7c3aed] hover:bg-[#6d28d9] text-white flex items-center justify-center shadow-xl shadow-[#7c3aed]/40 hover:scale-105 active:scale-95 transition-all duration-200"
            >
              {isLoadingAudioUrl ? (
                <Loader2 className="w-7 h-7 animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-7 h-7 fill-current" />
              ) : (
                <Play className="w-7 h-7 fill-current ml-1" />
              )}
            </button>

            <button
              onClick={() => handleSkip(15)}
              className="p-2 text-slate-500 hover:text-[#7c3aed] transition"
              title="Adelantar 15s"
            >
              <RotateCw className="w-5 h-5" />
            </button>

            <button
              onClick={handleNextTrack}
              disabled={activeTrackIndex === tracks.length - 1}
              className="p-2 text-slate-400 hover:text-[#0f2147] transition disabled:opacity-30"
              title="Siguiente capítulo"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          {/* Fila Inferior: Velocidad, Temporizador y Volumen */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            {/* Velocidad */}
            <div className="flex items-center rounded-xl bg-slate-100 p-0.5 font-bold">
              {[0.75, 1.0, 1.25, 1.5].map((rate) => (
                <button
                  key={rate}
                  onClick={() => handleSpeedChange(rate)}
                  className={`px-1.5 py-0.5 rounded-lg text-[10px] transition ${
                    playbackRate === rate
                      ? 'bg-white text-[#7c3aed] shadow-sm'
                      : 'text-slate-500 hover:text-[#0f2147]'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            {/* Temporizador */}
            <button
              onClick={() => {
                const options = [null, 5, 15, 30, -1];
                const currentIndex = options.indexOf(sleepTimerMinutes);
                const nextOption = options[(currentIndex + 1) % options.length];
                setSleepTimerMinutes(nextOption);
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold transition ${
                sleepTimerMinutes !== null
                  ? 'bg-[#7c3aed] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>
                {sleepTimerRemaining !== null
                  ? `${Math.ceil(sleepTimerRemaining / 60)}m`
                  : sleepTimerMinutes === -1
                  ? 'Fin'
                  : 'Timer'}
              </span>
            </button>

            {/* Control de Volumen */}
            <div className="flex items-center gap-1 text-slate-500">
              <button onClick={toggleMute} className="hover:text-[#0f2147] transition">
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-red-500" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-14 sm:w-16 h-1 bg-slate-200 rounded-lg accent-[#7c3aed] cursor-pointer"
                title="Volumen"
              />
            </div>
          </div>

          {/* Botón Discreto: Guardar para escuchar sin conexión (Cifrado AES-GCM en IndexedDB) */}
          <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-center">
            {offlineChapterNumbers.has(currentTrack.chapterNumber) ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[11px] font-bold shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>Disponible sin conexión</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteOffline(currentTrack.chapterNumber);
                  }}
                  className="text-slate-400 hover:text-red-500 ml-1 p-0.5 rounded transition"
                  title="Eliminar de la memoria local cifrada"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : isDownloading ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#7c3aed]/10 text-[#7c3aed] border border-[#7c3aed]/20 text-[11px] font-bold">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#7c3aed]" />
                <span>Cifrando en dispositivo... {downloadProgress}%</span>
              </div>
            ) : (
              <button
                onClick={() => handleDownloadOffline(currentTrack.chapterNumber, currentTrack.title, currentTrack.filename)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-[#7c3aed]/10 text-slate-600 hover:text-[#7c3aed] border border-slate-200/80 text-[11px] font-bold transition active:scale-95 cursor-pointer"
                title="Cifra con AES-GCM y guarda este capítulo en la memoria de tu dispositivo para reproducir sin internet"
              >
                <Download className="w-3.5 h-3.5 text-[#7c3aed]" />
                <span>Guardar para escuchar sin conexión</span>
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Botón flotante para abrir la Lista de Capítulos completa */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={() => setShowChapterDrawer(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/95 hover:bg-white text-[#0f2147] border border-white/80 shadow-lg text-xs font-black uppercase tracking-wider backdrop-blur-md transition-all active:scale-[0.98]"
        >
          <ListMusic className="w-4 h-4 text-[#7c3aed]" />
          <span>Ver Índice Oficial de Capítulos ({tracks.length} Pistas)</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#7c3aed]" />
        </button>
      </div>

      {/* MODAL / DRAWER INTERACTIVO: Lista de Capítulos del Audiolibro (1 al 113) */}
      {showChapterDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-2xl max-h-[90vh] rounded-3xl bg-white shadow-2xl flex flex-col overflow-hidden text-left relative animate-in fade-in zoom-in-95 duration-200">
            
            {/* Cabecera del Modal */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div>
                <h3 className="font-heading text-base sm:text-lg font-black text-[#0f2147] tracking-tight">
                  Capítulos del Audiolibro
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  101 Buenos Malos Consejos &bull; Robert Pacheco
                </p>
              </div>

              <button
                onClick={() => setShowChapterDrawer(false)}
                className="p-2 rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Barra de Búsqueda y Filtro Rápido */}
            <div className="p-4 border-b border-slate-100 bg-white">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar capítulo o consejo..."
                  className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-[#0f2147] focus:outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/10"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Botones de Salto Rápido por Rangos de Capítulos */}
              <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-bold text-slate-600 scrollbar-none">
                <span className="text-slate-400 mr-1 flex-shrink-0">Saltar a:</span>
                {[
                  { label: 'Portada / Intro', idx: 0 },
                  { label: 'Consejos 1-20', idx: 10 },
                  { label: 'Consejos 21-40', idx: 30 },
                  { label: 'Consejos 41-60', idx: 50 },
                  { label: 'Consejos 61-80', idx: 70 },
                  { label: 'Consejos 81-100', idx: 90 },
                  { label: 'Despedida', idx: 112 },
                ].map((range) => (
                  <button
                    key={range.label}
                    onClick={() => {
                      handleTrackChange(range.idx);
                      setShowChapterDrawer(false);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#7c3aed] hover:text-white transition flex-shrink-0"
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Listado con scroll de los 113 capítulos */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
              {filteredTracks.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Music className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-semibold">No se encontraron capítulos con "{searchQuery}"</p>
                </div>
              ) : (
                filteredTracks.map((track) => {
                  const isCurrent = track.chapterNumber === currentTrack.chapterNumber;
                  const trackOriginalIndex = tracks.findIndex(t => t.chapterNumber === track.chapterNumber);

                  return (
                    <div
                      key={track.chapterNumber}
                      onClick={() => {
                        handleTrackChange(trackOriginalIndex);
                        setShowChapterDrawer(false);
                      }}
                      className={`p-3 rounded-2xl border text-left cursor-pointer transition flex items-center justify-between gap-3 ${
                        isCurrent
                          ? 'bg-[#7c3aed]/10 border-[#7c3aed] text-[#0f2147] shadow-sm font-bold'
                          : 'bg-white border-slate-100 text-slate-700 hover:border-[#7c3aed]/40 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        {/* Número del capítulo */}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono text-xs font-black flex-shrink-0 ${
                          isCurrent
                            ? 'bg-[#7c3aed] text-white shadow-md'
                            : 'bg-slate-100 text-[#0f2147]'
                        }`}>
                          {track.chapterNumber}
                        </div>

                        {/* Título Oficial Limpio */}
                        <div className="overflow-hidden">
                          <p className="text-xs sm:text-sm font-bold text-[#0f2147] truncate">
                            {track.title}
                          </p>
                        </div>
                      </div>

                      {/* Estado de reproducción y disponibilidad offline */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {offlineChapterNumbers.has(track.chapterNumber) && (
                          <span 
                            className="p-1 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-1 text-[10px] font-bold"
                            title="Guardado y cifrado para escuchar sin conexión"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span className="hidden sm:inline">Offline</span>
                          </span>
                        )}

                        {isCurrent ? (
                          isPlaying ? (
                            <div className="flex items-end gap-0.5 h-4">
                              <span className="w-1 bg-[#7c3aed] h-3 animate-pulse" />
                              <span className="w-1 bg-[#7c3aed] h-4 animate-bounce" />
                              <span className="w-1 bg-[#7c3aed] h-2 animate-pulse" />
                            </div>
                          ) : (
                            <span className="text-[11px] font-bold text-[#7c3aed] bg-[#7c3aed]/15 px-2 py-0.5 rounded-md">
                              Seleccionado
                            </span>
                          )
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-400 group-hover:text-slate-600">
                            Saltar
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pie del Modal */}
            <div className="p-3 border-t border-slate-100 bg-slate-50 text-center text-xs text-slate-500 font-medium">
              101 Buenos Malos Consejos &bull; Robert Pacheco
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
