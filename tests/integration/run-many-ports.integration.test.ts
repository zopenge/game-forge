import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

interface ManagedCommandInput {
  readonly args: readonly string[];
  readonly backendUrlEnvName?: string;
  readonly name: string;
  readonly openPath?: string;
  readonly port: number;
}

interface ResolvedManagedCommand extends ManagedCommandInput {
  readonly env: Readonly<Record<string, string>>;
  readonly openUrl?: string;
  readonly resolvedPort: number;
}

const importPortsModule = async () => await import(pathToFileURL(join(
  process.cwd(),
  'scripts',
  'run-many-ports.mjs'
)).href) as {
  readonly resolveManagedCommands: (
    commands: readonly ManagedCommandInput[],
    isPortInUse: (port: number) => Promise<boolean>
  ) => Promise<readonly ResolvedManagedCommand[]>;
};

describe('run-many ports', () => {
  test('uses the next available port and keeps frontend proxy targets aligned', async () => {
    const { resolveManagedCommands } = await importPortsModule();
    const occupiedPorts = new Set([3001, 5173]);
    const commands: ManagedCommandInput[] = [
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

    const resolvedCommands = await resolveManagedCommands(
      commands,
      async (port) => occupiedPorts.has(port)
    );

    expect(resolvedCommands.map((command) => ({
      backendUrl: command.env.GAME_FORGE_BACKEND_URL,
      name: command.name,
      openUrl: command.openUrl,
      port: command.resolvedPort,
      processPort: command.env.PORT
    }))).toEqual([
      {
        backendUrl: undefined,
        name: 'backend',
        openUrl: undefined,
        port: 3002,
        processPort: '3002'
      },
      {
        backendUrl: 'http://127.0.0.1:3002',
        name: 'game-client',
        openUrl: 'http://127.0.0.1:5174/',
        port: 5174,
        processPort: '5174'
      },
      {
        backendUrl: undefined,
        name: 'admin-panel',
        openUrl: 'http://127.0.0.1:5175/',
        port: 5175,
        processPort: '5175'
      }
    ]);
  });
});
