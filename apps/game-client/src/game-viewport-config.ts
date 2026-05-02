export interface GameViewportConfig {
  readonly baseHeight: number;
  readonly baseWidth: number;
}

export const gameViewportConfig: GameViewportConfig = {
  baseHeight: 1080,
  baseWidth: 1920
};

export const getGameViewportAspectRatio = (config: GameViewportConfig = gameViewportConfig): number => (
  config.baseWidth / config.baseHeight
);
