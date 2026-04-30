const localHost = '127.0.0.1';

const createLocalUrl = (port, path = '') => {
  if (!path) {
    return `http://${localHost}:${port}`;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `http://${localHost}:${port}${normalizedPath}`;
};

const findAvailablePort = async (preferredPort, isPortInUse, reservedPorts) => {
  let candidatePort = preferredPort;

  while (reservedPorts.has(candidatePort) || await isPortInUse(candidatePort)) {
    candidatePort += 1;
  }

  reservedPorts.add(candidatePort);
  return candidatePort;
};

export const resolveManagedCommands = async (
  commands,
  isPortInUse
) => {
  const reservedPorts = new Set();
  const resolvedCommands = [];
  const backendCommand = commands.find((command) => command.name === 'backend');
  const preferredBackendPort = backendCommand?.port;
  let resolvedBackendUrl;

  for (const command of commands) {
    const resolvedPort = await findAvailablePort(command.port, isPortInUse, reservedPorts);
    const env = {
      PORT: String(resolvedPort)
    };

    if (command.name === 'backend') {
      resolvedBackendUrl = createLocalUrl(resolvedPort);
    }

    if (command.backendUrlEnvName && preferredBackendPort !== undefined) {
      env[command.backendUrlEnvName] = resolvedBackendUrl ?? createLocalUrl(preferredBackendPort);
    }

    resolvedCommands.push({
      ...command,
      env,
      ...(command.openPath ? { openUrl: createLocalUrl(resolvedPort, command.openPath) } : {}),
      resolvedPort
    });
  }

  return resolvedCommands;
};
