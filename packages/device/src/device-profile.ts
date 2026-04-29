export interface DeviceProfileOptions {
  readonly height: number;
  readonly pixelRatio: number;
  readonly userAgent: string;
  readonly width: number;
}

export interface DeviceProfile {
  readonly isTouchLike: boolean;
  readonly pixelRatio: number;
  readonly userAgent: string;
  readonly viewport: {
    height: number;
    width: number;
  };
}

export const createDeviceProfile = ({
  height,
  pixelRatio,
  userAgent,
  width
}: DeviceProfileOptions): DeviceProfile => ({
  isTouchLike: /android|iphone|ipad|mobile/i.test(userAgent),
  pixelRatio,
  userAgent,
  viewport: {
    height,
    width
  }
});

export const describeDeviceProfile = (profile: DeviceProfile) =>
  `${profile.viewport.width}x${profile.viewport.height} @${profile.pixelRatio}x ${profile.isTouchLike ? 'touch' : 'desktop'}`;
