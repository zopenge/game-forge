import { ensureBrowserHost } from '@game-forge/platform';

import { createAdminPanelApp } from './create-admin-panel-app';

const host = ensureBrowserHost(document, 'admin-panel-root');
const app = createAdminPanelApp({ host });

app.start();
