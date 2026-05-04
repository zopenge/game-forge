import { ensureBrowserHost } from '@game-forge/platform';

import { createGameShell } from './create-game-shell';

const host = ensureBrowserHost(document, 'game-client-root');
host.style.width = '100%';
host.style.height = '100%';

const app = createGameShell({ host });

void app.start();
window.addEventListener('resize', () => app.resize());
