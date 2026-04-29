// @vitest-environment jsdom

import { describe, expect, test } from 'vitest';

import { createAdminPanelApp, renderAdminPanelMarkup } from '../src/create-admin-panel-app';

describe('create-admin-panel-app', () => {
  test('renders the admin panel markup into the host', () => {
    const host = document.createElement('div');
    const app = createAdminPanelApp({ host });

    app.start();

    expect(host.textContent).toContain('admin panel');
  });

  test('builds descriptive markup', () => {
    const markup = renderAdminPanelMarkup();

    expect(markup).toContain('workspace ready');
    expect(markup).toContain('session');
  });
});
