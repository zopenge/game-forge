import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

const readGameClientIndex = () => readFileSync(join(
  process.cwd(),
  'apps',
  'game-client',
  'index.html'
), 'utf8');

const getStyleBlock = (html: string, selector: string) => {
  const selectorStart = html.indexOf(selector);

  if (selectorStart < 0) {
    return '';
  }

  const blockStart = html.indexOf('{', selectorStart);
  const blockEnd = html.indexOf('}', blockStart);

  return blockStart < 0 || blockEnd < 0 ? '' : html.slice(blockStart + 1, blockEnd);
};

describe('game client layout shell', () => {
  test('does not lock the lobby document to a clipped viewport', () => {
    const indexHtml = readGameClientIndex();
    const rootStyleBlock = getStyleBlock(indexHtml, '#game-client-root');

    expect(indexHtml).not.toMatch(/body\s*\{[^}]*overflow\s*:\s*hidden/i);
    expect(rootStyleBlock).not.toMatch(/(?:^|;)\s*height\s*:\s*100%/i);
  });
});
