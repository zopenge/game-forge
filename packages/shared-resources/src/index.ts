import type { ResourceManifest } from '@game-forge/resources';
import { createResourceRecordsFromManifests } from '@game-forge/resources';

import uiManifest from '../resource-manifests/ui.json';

export const sharedResources = createResourceRecordsFromManifests(
  [uiManifest as ResourceManifest],
  new URL('..', import.meta.url)
);
