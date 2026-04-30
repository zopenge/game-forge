import type { ResourceRecord } from '@game-forge/resources';

export const sharedResources = [
  {
    key: 'shared.ui-click',
    kind: 'text',
    preload: true,
    uri: new URL('../assets/ui-click.txt', import.meta.url).href
  },
  {
    key: 'shared.placeholder-image',
    kind: 'image',
    priority: 'lazy',
    uri: new URL('../assets/placeholder-image.svg', import.meta.url).href
  }
] satisfies readonly ResourceRecord[];
