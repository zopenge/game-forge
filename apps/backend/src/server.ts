import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { buildApp } from './app';

const defaultPort = 3001;
const defaultHost = '127.0.0.1';

const loadLocalEnv = () => {
  const loadEnvFile = (process as typeof process & {
    loadEnvFile?: (path?: string) => void;
  }).loadEnvFile;

  if (!loadEnvFile) {
    return;
  }

  const candidatePaths = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '..', '..', '.env')
  ];
  const envPath = candidatePaths.find((candidatePath) => existsSync(candidatePath));

  if (envPath) {
    loadEnvFile(envPath);
  }
};

const startServer = async () => {
  loadLocalEnv();

  const app = await buildApp(
    process.env.JWT_SECRET
      ? { jwtSecret: process.env.JWT_SECRET }
      : undefined
  );
  const host = process.env.HOST ?? defaultHost;
  const port = Number(process.env.PORT ?? defaultPort);

  try {
    await app.listen({
      host,
      port
    });

    app.log.info(`backend listening on http://${host}:${port}`);
  } catch (error) {
    app.log.error(error);
    process.exitCode = 1;
  }
};

void startServer();
