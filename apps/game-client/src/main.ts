import { ensureBrowserHost } from '@game-forge/platform';

import { createGameClientApp } from './create-game-client-app';

const host = ensureBrowserHost(document, 'game-client-root');
host.style.width = '100%';
host.style.height = '100%';

const app = createGameClientApp({ host });

app.start();
window.addEventListener('resize', () => app.resize());
