import { describe, expect, test } from 'vitest';

import { createDeviceProfile, describeDeviceProfile } from '../src/device-profile';

describe('create-device-profile', () => {
  test('describes a browser viewport', () => {
    const profile = createDeviceProfile({
      height: 1080,
      pixelRatio: 2,
      userAgent: 'desktop browser',
      width: 1920
    });

    expect(profile.isTouchLike).toBe(false);
    expect(describeDeviceProfile(profile)).toContain('1920x1080');
  });
});
