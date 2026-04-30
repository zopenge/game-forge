import { describe, expect, test } from 'vitest';

import { createGraphicsRenderBackend } from '../src/index';

describe('graphics-render-backend', () => {
  test('creates a backend factory with lifecycle methods', () => {
    const backend = createGraphicsRenderBackend();

    expect(backend.mount).toBeTypeOf('function');
    expect(backend.resize).toBeTypeOf('function');
    expect(backend.render).toBeTypeOf('function');
    expect(backend.dispose).toBeTypeOf('function');
  });
});
