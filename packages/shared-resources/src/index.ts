import type { ResourceManifest, ResourceUrlMap } from '@game-forge/resources';
import { createResourceRecordsFromManifests } from '@game-forge/resources';

import uiManifest from '../resource-manifests/ui.json';

type ImportMetaWithResourceGlob = ImportMeta & {
  glob(
    pattern: string,
    options: {
      readonly eager: true;
      readonly import: 'default';
      readonly query: '?url';
    }
  ): ResourceUrlMap;
};

const resourceUrls = (import.meta as ImportMetaWithResourceGlob).glob('../assets/**', {
  eager: true,
  import: 'default',
  query: '?url'
}) as ResourceUrlMap;

export const sharedResources = createResourceRecordsFromManifests(
  [uiManifest as ResourceManifest],
  new URL('..', import.meta.url),
  resourceUrls
);
