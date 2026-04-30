export type ResourceKind = 'image' | 'audio' | 'json' | 'text' | 'binary';
export type ResourceCachePolicy = 'memory' | 'none';
export type ResourcePriority = 'critical' | 'normal' | 'lazy';
export type ResourceLoadStatus = 'idle' | 'loading' | 'loaded' | 'failed';

export interface ResourceRecord {
  readonly cache?: ResourceCachePolicy;
  readonly key: string;
  readonly kind: ResourceKind;
  readonly preload?: boolean;
  readonly priority?: ResourcePriority;
  readonly uri: string;
}

export interface ResourceLoadState {
  readonly error?: Error;
  readonly key: string;
  readonly status: ResourceLoadStatus;
}

export interface ResourceCatalog {
  list(): readonly ResourceRecord[];
  resolve(key: string): ResourceRecord | undefined;
}

export type ResourceLoader = (record: ResourceRecord) => Promise<unknown>;
export type ResourceLoaderMap = Partial<Record<ResourceKind, ResourceLoader>>;

export interface FetchResourceResponse {
  arrayBuffer(): Promise<ArrayBuffer>;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

export interface CreateResourceManagerOptions {
  readonly fetchResource?: (uri: string) => Promise<FetchResourceResponse>;
  readonly loadAudio?: (uri: string) => Promise<unknown>;
  readonly loadImage?: (uri: string) => Promise<unknown>;
  readonly loaders?: ResourceLoaderMap;
  readonly resources: readonly ResourceRecord[];
}

export interface ResourceManager extends ResourceCatalog {
  getState(key: string): ResourceLoadState;
  load<T = unknown>(key: string): Promise<T>;
  preload(keys?: readonly string[]): Promise<void>;
  unload(key: string): void;
}

const createElementResourceLoader = (tagName: 'audio' | 'img') => async (uri: string) => new Promise<unknown>((resolve, reject) => {
  const element = document.createElement(tagName);

  element.addEventListener('load', () => resolve(element), {
    once: true
  });
  element.addEventListener('canplaythrough', () => resolve(element), {
    once: true
  });
  element.addEventListener('error', () => reject(new Error(`Unable to load resource: ${uri}.`)), {
    once: true
  });
  element.setAttribute('src', uri);
});

const getDefaultFetchResource = async (uri: string): Promise<FetchResourceResponse> => {
  const response = await fetch(uri);

  if (!response.ok) {
    throw new Error(`Unable to load resource: ${uri}.`);
  }

  return response;
};

export const createResourceCatalog = (resources: readonly ResourceRecord[]): ResourceCatalog => {
  const resourcesByKey = new Map<string, ResourceRecord>();

  for (const resource of resources) {
    if (resourcesByKey.has(resource.key)) {
      throw new Error(`Duplicate resource key: ${resource.key}.`);
    }

    resourcesByKey.set(resource.key, resource);
  }

  return {
    list: () => [...resources],
    resolve: (key) => resourcesByKey.get(key)
  };
};

export const createResourceManager = ({
  fetchResource = getDefaultFetchResource,
  loadAudio = createElementResourceLoader('audio'),
  loadImage = createElementResourceLoader('img'),
  loaders = {},
  resources
}: CreateResourceManagerOptions): ResourceManager => {
  const catalog = createResourceCatalog(resources);
  const cache = new Map<string, Promise<unknown> | unknown>();
  const states = new Map<string, ResourceLoadState>();
  const defaultLoaders = {
    audio: async (record: ResourceRecord) => loadAudio(record.uri),
    binary: async (record: ResourceRecord) => (await fetchResource(record.uri)).arrayBuffer(),
    image: async (record: ResourceRecord) => loadImage(record.uri),
    json: async (record: ResourceRecord) => (await fetchResource(record.uri)).json(),
    text: async (record: ResourceRecord) => (await fetchResource(record.uri)).text()
  } satisfies Record<ResourceKind, ResourceLoader>;
  const mergedLoaders = {
    ...defaultLoaders,
    ...loaders
  } satisfies Record<ResourceKind, ResourceLoader>;

  const requireRecord = (key: string) => {
    const record = catalog.resolve(key);

    if (!record) {
      throw new Error(`Unknown resource key: ${key}.`);
    }

    return record;
  };

  const setState = (state: ResourceLoadState) => {
    states.set(state.key, state);
  };

  const load = async <T = unknown>(key: string): Promise<T> => {
    const record = requireRecord(key);
    const cachePolicy = record.cache ?? 'memory';

    if (cachePolicy === 'memory' && cache.has(key)) {
      return await cache.get(key) as T;
    }

    setState({
      key,
      status: 'loading'
    });

    const loadOperation = mergedLoaders[record.kind](record)
      .then((value) => {
        setState({
          key,
          status: 'loaded'
        });

        if (cachePolicy === 'memory') {
          cache.set(key, value);
        }

        return value;
      })
      .catch((error: unknown) => {
        const resourceError = error instanceof Error ? error : new Error(String(error));
        cache.delete(key);
        setState({
          error: resourceError,
          key,
          status: 'failed'
        });
        throw resourceError;
      });

    if (cachePolicy === 'memory') {
      cache.set(key, loadOperation);
    }

    return await loadOperation as T;
  };

  return {
    getState: (key) => states.get(key) ?? {
      key,
      status: 'idle'
    },
    list: catalog.list,
    load,
    preload: async (keys) => {
      const requestedKeys = keys ?? [];
      const preloadKeys = catalog.list()
        .filter((resource) => resource.preload === true || resource.priority === 'critical')
        .map((resource) => resource.key);
      const keysToLoad = [...new Set([...preloadKeys, ...requestedKeys])];

      await Promise.all(keysToLoad.map((key) => load(key)));
    },
    resolve: catalog.resolve,
    unload: (key) => {
      requireRecord(key);
      cache.delete(key);
      states.delete(key);
    }
  };
};
