export interface UserRecord {
  readonly userId: string;
  readonly username: string;
}

export interface AssetRecord {
  readonly assetId: string;
  readonly quantity: number;
}

export interface AuthTokenPayload {
  readonly userId: string;
}
