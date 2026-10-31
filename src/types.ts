/**
 * Tipos de datos para '101 Buenos Malos Consejos'
 * Autor: por Robert Pacheco
 */

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  emailVerified?: boolean;
}

export interface CodigoDocument {
  id?: string;
  codigo: string;
  canjeado: boolean;
  usado_por: string | null;
  fecha_canje: string | null;
  created_at?: string;
}

export interface AudioTrackItem {
  id: number;
  chapterNumber: number;
  filename: string;
  title: string;
  subtitle: string;
  storagePath: string;
  audioUrl?: string;
  durationSeconds?: number;
}

export interface Chapter {
  id: number;
  numberRange: string;
  title: string;
  subtitle: string;
  category: string;
  readTimeMinutes: number;
  audioDurationSeconds: number;
  audioUrl: string;
  consejos: {
    number: number;
    title: string;
    quote: string;
    reflection: string;
    ruleOfThumb: string;
  }[];
}

export interface BookInfo {
  title: string;
  subtitle: string;
  author: string;
  edition: string;
  synopsis: string;
  coverImage?: string;
  totalChapters: number;
  totalAdviceCount: number;
  totalAudioDuration: string;
}

export type ReaderTheme = 'charcoal' | 'pitch' | 'sepia';
export type ReaderFontSize = 'sm' | 'base' | 'lg' | 'xl' | '2xl';
export type ReaderFontFamily = 'serif' | 'sans';

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;
  isMuted: boolean;
  currentChapterIndex: number;
  activeConsejoIndex: number;
}
