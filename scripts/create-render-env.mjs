import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const defaultOutputPath = '.render.env.local';
const defaultServiceName = 'game-forge-backend';

const readOption = (args, name) => {
  const optionIndex = args.indexOf(name);

  if (optionIndex === -1) {
    return undefined;
  }

  const value = args[optionIndex + 1];

  if (!value || value.startsWith('--')) {
    throw new Error(`${name} requires a value.`);
  }

  return value;
};

const args = process.argv.slice(2);
const outputPath = readOption(args, '--output') ?? defaultOutputPath;
const serviceName = readOption(args, '--service-name') ?? defaultServiceName;
const serviceUrl = readOption(args, '--service-url') ?? `https://${serviceName}.onrender.com`;
const absoluteOutputPath = resolve(process.cwd(), outputPath);
const jwtSecret = randomBytes(32).toString('hex');
const dotenvContent = [
  'HOST=0.0.0.0',
  `JWT_SECRET=${jwtSecret}`,
  'EVM_RPC_URL=https://ethereum.publicnode.com',
  'DEFAULT_EVM_CHAIN_ID=1',
  'WALLET_AUTH_MESSAGE_PREFIX=Sign this message to access Game Forge.'
].join('\n');

mkdirSync(dirname(absoluteOutputPath), { recursive: true });
writeFileSync(absoluteOutputPath, dotenvContent, 'utf8');

console.log(`Created ${outputPath}`);
console.log('Import or paste these values into Render -> Environment.');
console.log(`Backend URL for Vercel VITE_GAME_FORGE_API_BASE_URL: ${serviceUrl}`);
