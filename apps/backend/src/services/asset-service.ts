import type { AssetStore } from '../storage/asset-store';
import type { AssetRecord } from '../types/domain';

export class AssetError extends Error {}

export interface AssetService {
  listAssets(userId: string): AssetRecord[];
  setAsset(userId: string, assetId: string, quantity: number): AssetRecord;
}

export interface CreateAssetServiceOptions {
  readonly assetStore: AssetStore;
}

export const normalizeAssetId = (assetId: string) => assetId.trim();

export const validateAssetQuantity = (quantity: number) => {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new AssetError('Quantity must be a non-negative integer.');
  }
};

export const createAssetService = ({
  assetStore
}: CreateAssetServiceOptions): AssetService => ({
  listAssets: (userId) => assetStore.listByUserId(userId),
  setAsset: (userId, assetId, quantity) => {
    const normalizedAssetId = normalizeAssetId(assetId);

    if (!normalizedAssetId) {
      throw new AssetError('Asset id is required.');
    }

    validateAssetQuantity(quantity);

    return assetStore.setForUser(userId, normalizedAssetId, quantity);
  }
});
