import type { AssetRecord } from '../types/domain';

export interface AssetStore {
  listByUserId(userId: string): AssetRecord[];
  setForUser(userId: string, assetId: string, quantity: number): AssetRecord;
}

export const createAssetStore = (): AssetStore => {
  const assetsByUserId = new Map<string, Map<string, number>>();

  return {
    listByUserId: (userId) => {
      const userAssets = assetsByUserId.get(userId);

      if (!userAssets) {
        return [];
      }

      return Array.from(userAssets.entries())
        .map(([assetId, quantity]) => ({
          assetId,
          quantity
        }))
        .sort((left, right) => left.assetId.localeCompare(right.assetId));
    },
    setForUser: (userId, assetId, quantity) => {
      const userAssets = assetsByUserId.get(userId) ?? new Map<string, number>();
      userAssets.set(assetId, quantity);
      assetsByUserId.set(userId, userAssets);

      return {
        assetId,
        quantity
      };
    }
  };
};
