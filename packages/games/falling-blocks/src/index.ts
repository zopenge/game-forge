import { createTranslationCatalog } from '@game-forge/i18n';
import type { GameCartridge, GameCartridgeContext } from '@game-forge/game-cartridge';
import type { ThreeRenderScene } from '@game-forge/graphics';
import type { RuntimeModule } from '@game-forge/runtime';

import {
  AmbientLight,
  BoxGeometry,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial
} from 'three';

export const fallingBlocksMessages = createTranslationCatalog({
  'en-US': {
    'falling-blocks.description': 'A simple falling block board for testing grids, rotation, line clears, and fail state.',
    'falling-blocks.tag.puzzle': 'Puzzle',
    'falling-blocks.tag.grid': 'Grid',
    'falling-blocks.title': 'Falling Blocks'
  },
  'zh-CN': {
    'falling-blocks.description': '用于测试网格、旋转、消行和失败状态的简化落块游戏。',
    'falling-blocks.tag.puzzle': '益智',
    'falling-blocks.tag.grid': '网格',
    'falling-blocks.title': '俄罗斯方块'
  }
});

export type FallingBlocksMessageKey = keyof typeof fallingBlocksMessages['en-US'];

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
): RuntimeModule<ThreeRenderScene> => {
  const root = new Group();
  root.name = context.i18n.t('falling-blocks.title');
  const state = createFallingBlocksState();
  const blockGeometry = new BoxGeometry(0.18, 0.18, 0.08);
  const activeMaterial = new MeshStandardMaterial({
    color: 0x69d1ff,
    roughness: 0.35
  });
  const lockedMaterial = new MeshStandardMaterial({
    color: 0x59ffcf,
    roughness: 0.4
  });
  const meshes: Mesh<BoxGeometry, MeshStandardMaterial>[] = [];
  let dropElapsedMs = 0;

  const syncMeshes = () => {
    for (const mesh of meshes) {
      root.remove(mesh);
    }

    meshes.length = 0;

    const addBlock = (x: number, y: number, material: MeshStandardMaterial) => {
      const mesh = new Mesh(blockGeometry, material);
      mesh.position.set((x - 4.5) * 0.2, (8.5 - y) * 0.2, 0);
      root.add(mesh);
      meshes.push(mesh);
    };

    state.board.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value === 1) {
          addBlock(x, y, lockedMaterial);
        }
      });
    });

    for (const cell of getAbsoluteCells(state.activePiece)) {
      addBlock(cell.x, cell.y, activeMaterial);
    }
  };

  return {
    setup: ({ scene }) => {
      const ambientLight = new AmbientLight(0xffffff, 0.55);
      const directionalLight = new DirectionalLight(0xffffff, 1.2);
      directionalLight.position.set(3, 4, 5);
      root.add(ambientLight, directionalLight);
      syncMeshes();
      scene.scene.add(root);

      return () => {
        scene.scene.remove(root);
        root.clear();
        blockGeometry.dispose();
        activeMaterial.dispose();
        lockedMaterial.dispose();
      };
    },
    update: ({ frame }) => {
      dropElapsedMs += frame.deltaMs;

      if (dropElapsedMs >= 600) {
        dropElapsedMs = 0;
        moveFallingBlocksDown(state);
        rotateFallingBlocksPiece(state);
        syncMeshes();
      }
    }
  };
};

export const fallingBlocksGameCartridge: GameCartridge<FallingBlocksMessageKey> = {
  capabilities: {
    graphics: 'three',
    input: 'keyboard',
    networking: 'none'
  },
  createModule: createFallingBlocksModule,
  descriptionKey: 'falling-blocks.description',
  id: 'falling-blocks',
  messages: fallingBlocksMessages,
  tagKeys: ['falling-blocks.tag.puzzle', 'falling-blocks.tag.grid'],
  themeColor: '#69d1ff',
  titleKey: 'falling-blocks.title'
};
