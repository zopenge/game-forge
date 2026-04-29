import { describe, expect, test } from 'vitest';

import { createAssetCatalog } from '../src/asset-catalog';

describe('create-asset-catalog', () => {
  test('registers and resolves assets', () => {
    const catalog = createAssetCatalog();

    catalog.register('hero-texture', {
      kind: 'texture',
      uri: '/textures/hero.png'
    });

    expect(catalog.resolve('hero-texture')).toEqual({
      kind: 'texture',
      uri: '/textures/hero.png'
    });
    expect(catalog.list()).toHaveLength(1);
  });
});
