import console from 'node:console';
import { existsSync } from 'node:fs';
import net from 'node:net';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveManagedCommands } from './run-many-ports.mjs';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(scriptDirectory, '..');
const workspaceEnvPath = resolve(workspaceRoot, '.env');

if (existsSync(workspaceEnvPath) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(workspaceEnvPath);
}

const managedCommands = [
  {
    args: ['--filter', '@game-forge/backend', 'dev'],
    name: 'backend',
    port: 3001
  },
  {
    args: ['--filter', '@game-forge/game-client', 'dev'],
    backendUrlEnvName: 'GAME_FORGE_BACKEND_URL',
    name: 'game-client',
    openPath: '/',
    port: 5173
  },
  {
    args: ['--filter', '@game-forge/admin-panel', 'dev'],
    name: 'admin-panel',
    openPath: '/',
    port: 5174
  }
];

const colorByName = new Map([
  ['admin-panel', '\u001b[35m'],
  ['backend', '\u001b[36m'],
  ['game-client', '\u001b[32m']
]);
const resetColor = '\u001b[0m';
const children = [];
const openedUrls = new Set();
let shuttingDown = false;

const canOpenBrowser = process.env.GAME_FORGE_OPEN_BROWSER !== '0';

const isPortInUse = async (port) => new Promise((resolvePort) => {
  const server = net.createServer();

  server.once('error', (error) => {
    resolvePort(error.code === 'EADDRINUSE');
  });
  server.once('listening', () => {
    server.close(() => {
      resolvePort(false);
    });
  });
  server.listen(port, '127.0.0.1');
});

const isPortListening = async (port) => new Promise((resolvePort) => {
  const socket = net.createConnection({
    host: '127.0.0.1',
    port
  });

  socket.once('connect', () => {
    socket.destroy();
    resolvePort(true);
  });
  socket.once('error', () => {
    resolvePort(false);
  });
});

const waitForPort = async (port, timeoutMs = 30_000) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isPortListening(port)) {
      return true;
    }

    await delay(250);
  }

  return false;
};

const openBrowser = (url) => {
  if (!canOpenBrowser || openedUrls.has(url)) {
    return;
  }

  openedUrls.add(url);

  if (process.platform === 'win32') {
    spawn('cmd.exe', ['/d', '/c', 'start', '', url], {
      detached: true,
      stdio: 'ignore'
    }).unref();
    return;
  }

  if (process.platform === 'darwin') {
    spawn('open', [url], {
      detached: true,
      stdio: 'ignore'
    }).unref();
    return;
  }

  spawn('xdg-open', [url], {
    detached: true,
    stdio: 'ignore'
  }).unref();
};

const createPrefixedWriter = (name, stream) => {
  const color = colorByName.get(name) ?? '';
  let buffered = '';

  return (chunk) => {
    buffered += chunk.toString();
    const lines = buffered.split(/\r?\n/);
    buffered = lines.pop() ?? '';

    for (const line of lines) {
      if (!line) {
        stream.write('\n');
        continue;
      }

      stream.write(`${color}[${name}]${resetColor} ${line}\n`);
    }
  };
};

const terminateChild = async (child) => {
  if (child.exitCode !== null || child.killed) {
    return;
  }

  if (process.platform === 'win32') {
    await new Promise((resolveTermination) => {
      const killer = spawn('taskkill.exe', ['/pid', String(child.pid), '/t', '/f'], {
        stdio: 'ignore'
      });

      killer.on('close', () => {
        resolveTermination();
      });
      killer.on('error', () => {
        resolveTermination();
      });
    });
    return;
  }

  child.kill('SIGTERM');
};

const shutdown = async (exitCode = 0) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log('\nShutting down development services...');
  await Promise.all(children.map(terminateChild));
  process.exit(exitCode);
};

const resolvedCommands = await resolveManagedCommands(managedCommands, isPortInUse);

for (const command of resolvedCommands) {
  if (command.resolvedPort !== command.port) {
    console.warn(`${command.name} default port ${command.port} is in use; using ${command.resolvedPort} instead.`);
  }
}

for (const command of resolvedCommands) {
  const child = process.platform === 'win32'
    ? spawn('cmd.exe', ['/d', '/c', 'pnpm', ...command.args], {
      cwd: workspaceRoot,
      env: {
        ...process.env,
        ...command.env
      },
      stdio: ['ignore', 'pipe', 'pipe']
    })
    : spawn('pnpm', command.args, {
      cwd: workspaceRoot,
      env: {
        ...process.env,
        ...command.env
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

  const writeStdout = createPrefixedWriter(command.name, process.stdout);
  const writeStderr = createPrefixedWriter(command.name, process.stderr);

  child.stdout.on('data', writeStdout);
  child.stderr.on('data', writeStderr);
  void waitForPort(command.resolvedPort).then((isReady) => {
    if (!isReady || shuttingDown) {
      return;
    }

    console.log(`${command.name} is ready on port ${command.resolvedPort}.`);

    if (command.openUrl) {
      openBrowser(command.openUrl);
    }
  });
  child.on('close', async (code) => {
    if (shuttingDown) {
      return;
    }

    const normalizedCode = code ?? 0;

    if (normalizedCode !== 0) {
      console.error(`${command.name} exited with code ${normalizedCode}.`);
      await shutdown(normalizedCode);
      return;
    }

    console.log(`${command.name} exited cleanly.`);
    await shutdown(0);
  });
  child.on('error', async (error) => {
    console.error(`${command.name} failed to start: ${error.message}`);
    await shutdown(1);
  });
  children.push(child);
}

process.on('SIGINT', () => {
  void shutdown(0);
});
process.on('SIGTERM', () => {
  void shutdown(0);
});
