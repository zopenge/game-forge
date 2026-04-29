import { closeSync, existsSync, mkdirSync, openSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import console from 'node:console';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(scriptDirectory, '..');
const logDirectory = join(workspaceRoot, 'logs');

const [filterName, scriptName, logFileName] = process.argv.slice(2);

if (!filterName || !scriptName || !logFileName) {
  throw new Error('Usage: node scripts/run-with-log.mjs <filter-name> <script-name> <log-file-name>');
}

if (!existsSync(logDirectory)) {
  mkdirSync(logDirectory, { recursive: true });
}

const logPath = join(logDirectory, logFileName);

if (existsSync(logPath)) {
  rmSync(logPath, { force: true });
}

const logFileDescriptor = openSync(logPath, 'a');
const childProcess = process.platform === 'win32'
  ? spawn(
    'cmd.exe',
    ['/d', '/c', 'pnpm', '--filter', filterName, scriptName],
    {
      cwd: workspaceRoot,
      detached: true,
      stdio: ['ignore', logFileDescriptor, logFileDescriptor]
    }
  )
  : spawn(
    'pnpm',
    ['--filter', filterName, scriptName],
    {
      cwd: workspaceRoot,
      detached: true,
      stdio: ['ignore', logFileDescriptor, logFileDescriptor]
    }
  );

childProcess.unref();
closeSync(logFileDescriptor);

console.log(`${filterName} ${scriptName} log: ${logPath}`);
