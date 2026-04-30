import { describe, expect, test } from 'vitest';

import { sharedResources } from '../src/index';

describe('shared-resources', () => {
  test('exports shared resources with shared keys', () => {
    expect(sharedResources.length).toBeGreaterThan(0);
    expect(sharedResources.every((resource) => resource.key.startsWith('shared.'))).toBe(true);
    expect(sharedResources.every((resource) => resource.uri.length > 0)).toBe(true);
  });
});
