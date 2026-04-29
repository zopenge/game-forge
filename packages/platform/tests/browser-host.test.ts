// @vitest-environment jsdom

import { describe, expect, test } from 'vitest';

import { ensureBrowserHost } from '../src/browser-host';

describe('ensure-browser-host', () => {
  test('reuses an existing host or creates one when needed', () => {
    const existing = document.createElement('div');
    existing.id = 'workspace-host';
    document.body.append(existing);

    expect(ensureBrowserHost(document, 'workspace-host')).toBe(existing);

    const created = ensureBrowserHost(document, 'missing-host');
    expect(created.id).toBe('missing-host');
    expect(document.body.contains(created)).toBe(true);
  });
});
