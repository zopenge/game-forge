export interface AssetRecord {
  readonly kind: string;
  readonly uri: string;
}

export interface AssetCatalog {
  list(): AssetRecord[];
  register(key: string, asset: AssetRecord): void;
  resolve(key: string): AssetRecord | undefined;
}

export const createAssetCatalog = (): AssetCatalog => {
  const assets = new Map<string, AssetRecord>();

  return {
    list: () => Array.from(assets.values()),
    register: (key, asset) => {
      assets.set(key, asset);
    },
    resolve: (key) => assets.get(key)
  };
};
