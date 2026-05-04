/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GAME_FORGE_API_BASE_URL?: string;
  readonly VITE_GAME_FORGE_SIGNALING_BASE_URL?: string;
}

declare module '*.css';
