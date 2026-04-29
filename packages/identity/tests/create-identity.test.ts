import { describe, expect, test } from 'vitest';

import { createIdGenerator, createSessionId } from '../src/create-identity';

describe('create-id-generator', () => {
  test('emits predictable incremental identifiers', () => {
    const generator = createIdGenerator('entity');

    expect(generator.next()).toBe('entity-0001');
    expect(generator.next()).toBe('entity-0002');
  });

  test('creates a session identifier with the requested prefix', () => {
    expect(createSessionId('admin')).toMatch(/^admin-/);
  });
});
