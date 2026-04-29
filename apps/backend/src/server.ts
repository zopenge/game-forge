import { buildApp } from './app';

const defaultPort = 3001;

const startServer = async () => {
  const app = await buildApp(
    process.env.JWT_SECRET
      ? { jwtSecret: process.env.JWT_SECRET }
      : undefined
  );
  const port = Number(process.env.PORT ?? defaultPort);

  try {
    await app.listen({
      host: '127.0.0.1',
      port
    });

    app.log.info(`backend listening on http://127.0.0.1:${port}`);
  } catch (error) {
    app.log.error(error);
    process.exitCode = 1;
  }
};

void startServer();
