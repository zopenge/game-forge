import type { GameCartridge, GameCartridgeContext } from '@game-forge/game-cartridge';
import type { GraphicsNode, GraphicsRenderScene } from '@game-forge/graphics';
import type { ResourceManifest, ResourceUrlMap } from '@game-forge/resources';
import { createTranslationCatalog } from '@game-forge/i18n';
import { createResourceRecordsFromManifests } from '@game-forge/resources';
import type { RuntimeModule } from '@game-forge/runtime';

import coreResourceManifest from '../resource-manifests/core.json';
import enUsMessages from '../translations/en-US.json';
import zhCnMessages from '../translations/zh-CN.json';

const fallingBlocksCatalog = {
  'en-US': enUsMessages,
  'zh-CN': zhCnMessages
};

export const fallingBlocksMessages = createTranslationCatalog(fallingBlocksCatalog);

export type FallingBlocksMessageKey = keyof typeof fallingBlocksMessages['en-US'];

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
});

export const fallingBlocksResources = createResourceRecordsFromManifests(
  [coreResourceManifest as ResourceManifest],
  new URL('..', import.meta.url),
  resourceUrls
);

export interface FallingBlocksCell {
  readonly x: number;
  readonly y: number;
}

export interface FallingBlocksPiece {
  cells: FallingBlocksCell[];
  position: {
    x: number;
    y: number;
  };
}

export interface FallingBlocksState {
  activePiece: FallingBlocksPiece;
  readonly board: number[][];
  isGameOver: boolean;
  linesCleared: number;
}

export const fallingBlocksBoardWidth = 10;
export const fallingBlocksBoardHeight = 18;

export const createFallingBlocksState = (): FallingBlocksState => ({
  activePiece: {
    cells: [
      { x: -1, y: 0 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 }
    ],
    position: {
      x: 4,
      y: 0
    }
  },
  board: Array.from({ length: fallingBlocksBoardHeight }, () => Array.from({ length: fallingBlocksBoardWidth }, () => 0)),
  isGameOver: false,
  linesCleared: 0
});

const getAbsoluteCells = (piece: FallingBlocksPiece) => piece.cells.map((cell) => ({
  x: piece.position.x + cell.x,
  y: piece.position.y + cell.y
}));

const collides = (state: FallingBlocksState, piece: FallingBlocksPiece) => getAbsoluteCells(piece).some((cell) => (
  cell.x < 0
  || cell.x >= fallingBlocksBoardWidth
  || cell.y >= fallingBlocksBoardHeight
  || (cell.y >= 0 && state.board[cell.y]?.[cell.x] === 1)
));

const spawnPiece = (state: FallingBlocksState) => {
  state.activePiece = {
    cells: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 }
    ],
    position: {
      x: 4,
      y: 0
    }
  };
  state.isGameOver = collides(state, state.activePiece);
};

const lockPiece = (state: FallingBlocksState) => {
  for (const cell of getAbsoluteCells(state.activePiece)) {
    if (cell.y < 0) {
      state.isGameOver = true;
      return;
    }

    state.board[cell.y]![cell.x] = 1;
  }

  const remainingRows = state.board.filter((row) => row.some((value) => value === 0));
  const cleared = fallingBlocksBoardHeight - remainingRows.length;

  state.linesCleared += cleared;
  state.board.splice(
    0,
    state.board.length,
    ...Array.from({ length: cleared }, () => Array.from({ length: fallingBlocksBoardWidth }, () => 0)),
    ...remainingRows
  );
  spawnPiece(state);
};

export const moveFallingBlocksDown = (state: FallingBlocksState) => {
  if (state.isGameOver) {
    return;
  }

  const nextPiece = {
    cells: state.activePiece.cells,
    position: {
      x: state.activePiece.position.x,
      y: state.activePiece.position.y + 1
    }
  };

  if (collides(state, nextPiece)) {
    lockPiece(state);
    return;
  }

  state.activePiece.position = nextPiece.position;
};

export const rotateFallingBlocksPiece = (state: FallingBlocksState) => {
  if (state.isGameOver) {
    return;
  }

  const nextPiece = {
    cells: state.activePiece.cells.map((cell) => ({
      x: -cell.y,
      y: cell.x
    })),
    position: state.activePiece.position
  };

  if (!collides(state, nextPiece)) {
    state.activePiece.cells = nextPiece.cells;
  }
};

export const createFallingBlocksModule = (
  context: GameCartridgeContext<FallingBlocksMessageKey>
): RuntimeModule<GraphicsRenderScene> => {
  const state = createFallingBlocksState();
  const meshes: GraphicsNode[] = [];
  let dropElapsedMs = 0;
  let root: GraphicsNode | undefined;

  const syncMeshes = (scene: GraphicsRenderScene) => {
    if (!root) {
      return;
    }

    for (const mesh of meshes) {
      root.remove(mesh);
      mesh.dispose();
    }

    meshes.length = 0;

    const addBlock = (x: number, y: number, color: number) => {
      if (!root) {
        return;
      }

      const mesh = scene.scene.createBox({
        color,
        depth: 0.08,
        height: 0.18,
        roughness: 0.35,
        width: 0.18
      });
      mesh.position.set((x - 4.5) * 0.2, (8.5 - y) * 0.2, 0);
      root.add(mesh);
      meshes.push(mesh);
    };

    state.board.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value === 1) {
          addBlock(x, y, 0x59ffcf);
        }
      });
    });

    for (const cell of getAbsoluteCells(state.activePiece)) {
      addBlock(cell.x, cell.y, 0x69d1ff);
    }
  };

  return {
    setup: ({ scene }) => {
      root = scene.scene.createGroup();
      root.name = context.i18n.t('falling-blocks.title');
      root.userData.resourceUri = context.resources.resolve('falling-blocks.board-config')?.uri;

      const ambientLight = scene.scene.createAmbientLight({
        color: 0xffffff,
        intensity: 0.55
      });
      const directionalLight = scene.scene.createDirectionalLight({
        color: 0xffffff,
        intensity: 1.2
      });
      directionalLight.position.set(3, 4, 5);
      root.add(ambientLight, directionalLight);
      syncMeshes(scene);
      scene.scene.add(root);

      return () => {
        if (!root) {
          return;
        }

        scene.scene.remove(root);
        root.dispose();
        meshes.length = 0;
        root = undefined;
      };
    },
    update: ({ frame, scene }) => {
      dropElapsedMs += frame.deltaMs;

      if (dropElapsedMs >= 600) {
        dropElapsedMs = 0;
        moveFallingBlocksDown(state);
        rotateFallingBlocksPiece(state);
        syncMeshes(scene);
      }
    }
  };
};

export const fallingBlocksGameCartridge: GameCartridge<FallingBlocksMessageKey> = {
  capabilities: {
    graphics: 'scene-graph-3d',
    input: 'keyboard',
    networking: 'none'
  },
  createModule: createFallingBlocksModule,
  descriptionKey: 'falling-blocks.description',
  id: 'falling-blocks',
  messages: fallingBlocksMessages,
  resources: fallingBlocksResources,
  tagKeys: ['falling-blocks.tag.puzzle', 'falling-blocks.tag.grid'],
  themeColor: '#69d1ff',
  titleKey: 'falling-blocks.title',
  viewport: {
    designHeight: 18,
    designWidth: 10
  }
};
