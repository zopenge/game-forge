import type { ResourceManager, ResourceRecord } from '@game-forge/resources';
import type { GraphicsRenderScene } from '@game-forge/graphics';
import type { LocaleCode, TranslationCatalogShape, TranslationParams } from '@game-forge/i18n';
import type { InputController } from '@game-forge/input';
import type { GameMultiplayerService } from '@game-forge/networking';
import type { RuntimeModule } from '@game-forge/runtime';
import type { WalletAssetSnapshot } from '@game-forge/wallet-core';

export type GameCartridgeMessages<messageKey extends string = string> = Record<
  LocaleCode,
  Record<messageKey, string>
> & TranslationCatalogShape;

export interface GameCartridgeI18n<messageKey extends string = string> {
  readonly locale: LocaleCode;
  t(key: messageKey, params?: TranslationParams): string;
}

export interface GameCartridgeNetworkingService {
  readonly isAvailable: boolean;
}

export interface GameCartridgeServices {
  readonly multiplayer?: GameMultiplayerService;
  readonly networking?: GameCartridgeNetworkingService;
}

export interface GameCartridgeContext<messageKey extends string = string> {
  readonly assets: readonly {
    readonly assetId: string;
    readonly quantity: number;
  }[];
  readonly i18n: GameCartridgeI18n<messageKey>;
  readonly input: InputController;
  readonly player: {
    readonly authMethod: 'username' | 'wallet' | 'wechat';
    readonly userId: string;
    readonly username: string;
    readonly walletAddress?: string;
    readonly walletChainId?: number;
  };
  readonly resources: ResourceManager;
  readonly services: GameCartridgeServices;
  readonly walletAssets?: WalletAssetSnapshot;
}

export interface GameCartridgeCapabilities {
  readonly graphics: 'scene-graph-3d';
  readonly input: 'mapped-actions';
  readonly matchmaking?: boolean;
  readonly networking?: 'none' | 'client-server' | 'p2p';
}

export interface GameCartridgeViewportConfig {
  readonly designHeight: number;
  readonly designWidth: number;
}

export interface GameCartridge<messageKey extends string = string> {
  readonly capabilities: GameCartridgeCapabilities;
  createModule(context: GameCartridgeContext<messageKey>): RuntimeModule<GraphicsRenderScene>;
  readonly descriptionKey: messageKey;
  readonly id: string;
  readonly messages: GameCartridgeMessages<messageKey>;
  readonly resources?: readonly ResourceRecord[];
  readonly tagKeys: readonly messageKey[];
  readonly themeColor: string;
  readonly titleKey: messageKey;
  readonly viewport?: GameCartridgeViewportConfig;
}
