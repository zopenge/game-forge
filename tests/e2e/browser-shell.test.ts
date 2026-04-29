// @vitest-environment jsdom

import { describe, expect, test } from 'vitest';

import { createAdminPanelApp } from '../../apps/admin-panel/src/create-admin-panel-app';
import { ensureBrowserHost } from '@game-forge/platform';

describe('workspace browser shell', () => {
  test('mounts the admin panel into a browser host', () => {
    const host = ensureBrowserHost(document, 'e2e-admin-root');

    createAdminPanelApp({ host }).start();

    expect(host.innerHTML).toContain('admin panel');
  });
});
