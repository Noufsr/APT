// src/global.d.ts
export {};

declare global {
  interface Window {
    electronAPI?: {
      onCerrarSesion: (callback: (...args: any[]) => void) => void;
    };
  }
}
