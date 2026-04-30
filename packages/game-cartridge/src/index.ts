import type { ResourceManager, ResourceRecord } from '@game-forge/resources';
import type { ThreeRenderScene } from '@game-forge/graphics';
import type { LocaleCode, TranslationCatalogShape, TranslationParams } from '@game-forge/i18n';
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
  readonly networking?: GameCartridgeNetworkingService;
}

export interface GameCartridgeContext<messageKey extends string = string> {
  readonly assets: readonly {
    readonly assetId: string;
    readonly quantity: number;
  }[];
  readonly i18n: GameCartridgeI18n<messageKey>;
  readonly player: {
    readonly authMethod: 'username' | 'wallet';
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
  readonly graphics: 'three';
  readonly input: 'keyboard';
  readonly matchmaking?: boolean;
  readonly networking?: 'none' | 'client-server' | 'p2p';
}

export interface GameCartridge<messageKey extends string = string> {
  readonly capabilities: GameCartridgeCapabilities;
  createModule(context: GameCartridgeContext<messageKey>): RuntimeModule<ThreeRenderScene>;
  readonly descriptionKey: messageKey;
  readonly id: string;
  readonly messages: GameCartridgeMessages<messageKey>;
  readonly resources?: readonly ResourceRecord[];
  readonly tagKeys: readonly messageKey[];
  readonly themeColor: string;
  readonly titleKey: messageKey;
}

export interface GameCartridgeRegistry {
  findById(id: string): GameCartridge | undefined;
  list(): readonly GameCartridge[];
}

export const createGameCartridgeRegistry = (
  cartridges: readonly GameCartridge[]
): GameCartridgeRegistry => {
  const cartridgesById = new Map<string, GameCartridge>();

  for (const cartridge of cartridges) {
    if (cartridgesById.has(cartridge.id)) {
      throw new Error(`Duplicate game cartridge id: ${cartridge.id}.`);
    }

    cartridgesById.set(cartridge.id, cartridge);
  }

  return {
    findById: (id) => cartridgesById.get(id),
    list: () => [...cartridges]
  };
};
