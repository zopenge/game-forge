import type { GameCartridge, GameCartridgeContext } from '@game-forge/game-cartridge';
import type { GraphicsNode, GraphicsRenderScene, GraphicsSceneNode } from '@game-forge/graphics';
import type { ResourceManifest, ResourceUrlMap } from '@game-forge/resources';
import { createTranslationCatalog } from '@game-forge/i18n';
import { createResourceRecordsFromManifests } from '@game-forge/resources';
import type { RuntimeModule } from '@game-forge/runtime';

import coreResourceManifest from '../resource-manifests/core.json';
import enUsMessages from '../translations/en-US.json';
import zhCnMessages from '../translations/zh-CN.json';

const beeShooterCatalog = {
  'en-US': enUsMessages,
  'zh-CN': zhCnMessages
};

export const beeShooterMessages = createTranslationCatalog(beeShooterCatalog);

export type BeeShooterMessageKey = keyof typeof beeShooterMessages['en-US'];

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

export const beeShooterResources = createResourceRecordsFromManifests(
  [coreResourceManifest as ResourceManifest],
  new URL('..', import.meta.url),
  resourceUrls
);

interface Projectile {
  readonly node: GraphicsNode;
  readonly velocityY: number;
}

interface Enemy {
  readonly node: GraphicsNode;
  readonly speedX: number;
}

interface BeeInputMessage {
  readonly fire: boolean;
  readonly moveLeft: number;
  readonly moveRight: number;
}

interface BeeSnapshotMessage {
  readonly enemies: readonly {
    readonly x: number;
    readonly y: number;
  }[];
  readonly players: readonly {
    readonly peerId: string;
    readonly x: number;
  }[];
  readonly projectiles: readonly {
    readonly x: number;
    readonly y: number;
  }[];
  readonly score: number;
}

const beeInputChannel = 'bee.input';
const beeSnapshotChannel = 'bee.snapshot';

const isBeeSnapshotMessage = (payload: unknown): payload is BeeSnapshotMessage => (
  typeof payload === 'object'
  && payload !== null
  && Array.isArray((payload as BeeSnapshotMessage).players)
  && Array.isArray((payload as BeeSnapshotMessage).projectiles)
  && Array.isArray((payload as BeeSnapshotMessage).enemies)
  && typeof (payload as BeeSnapshotMessage).score === 'number'
);

export const createBeeShooterModule = (
  context: GameCartridgeContext<BeeShooterMessageKey>
): RuntimeModule<GraphicsRenderScene> => {
  const projectiles: Projectile[] = [];
  const enemies: Enemy[] = [];
  const multiplayer = context.services.multiplayer;
  const multiplayerSession = multiplayer?.session;
  const remoteInputByPeer = new Map<string, BeeInputMessage>();
  const localPeerId = multiplayerSession?.localPeerId ?? context.player.userId;
  let remotePlayer: GraphicsNode | undefined;
  let player: GraphicsNode | undefined;
  let root: GraphicsNode | undefined;
  let sceneGraph: GraphicsSceneNode | undefined;
  let score = 0;
  let unsubscribeInput: () => void = () => undefined;
  let unsubscribeSnapshot: () => void = () => undefined;

  const createProjectile = (x = player?.position.x ?? 0) => {
    if (!root || !sceneGraph) {
      return;
    }

    const node = sceneGraph.createSphere({
      color: 0xfff06a,
      emissive: 0x4a3900,
      heightSegments: 8,
      radius: 0.06,
      widthSegments: 12
    });
    node.position.set(x, -1.2, 0);
    root.add(node);
    projectiles.push({
      node,
      velocityY: 0.018
    });
  };

  const createEnemy = (index: number) => {
    if (!root || !sceneGraph) {
      return;
    }

    const node = sceneGraph.createBox({
      color: 0x59ffcf,
      depth: 0.12,
      height: 0.2,
      metalness: 0.1,
      roughness: 0.4,
      width: 0.32
    });
    node.position.set(-1.6 + index * 0.8, 1.05 + (index % 2) * 0.28, 0);
    root.add(node);
    enemies.push({
      node,
      speedX: index % 2 === 0 ? 0.006 : -0.006
    });
  };

  const removeProjectile = (projectile: Projectile) => {
    root?.remove(projectile.node);
    projectile.node.dispose();
    projectiles.splice(projectiles.indexOf(projectile), 1);
  };

  const removeEnemy = (enemy: Enemy) => {
    root?.remove(enemy.node);
    enemy.node.dispose();
    enemies.splice(enemies.indexOf(enemy), 1);
  };

  const applySnapshot = (snapshot: BeeSnapshotMessage) => {
    if (!player) {
      return;
    }

    const localPlayerSnapshot = snapshot.players.find((nextPlayer) => nextPlayer.peerId === localPeerId);
    const remotePlayerSnapshot = snapshot.players.find((nextPlayer) => nextPlayer.peerId !== localPeerId);

    if (localPlayerSnapshot) {
      player.position.x = localPlayerSnapshot.x;
    }

    if (remotePlayer && remotePlayerSnapshot) {
      remotePlayer.position.x = remotePlayerSnapshot.x;
    }

    score = snapshot.score;
  };

  const createSnapshot = (): BeeSnapshotMessage => ({
    enemies: enemies.map((enemy) => ({
      x: enemy.node.position.x,
      y: enemy.node.position.y
    })),
    players: [
      {
        peerId: localPeerId,
        x: player?.position.x ?? 0
      },
      ...(remotePlayer && multiplayerSession?.peers[0] ? [{
        peerId: multiplayerSession.peers[0].id,
        x: remotePlayer.position.x
      }] : [])
    ],
    projectiles: projectiles.map((projectile) => ({
      x: projectile.node.position.x,
      y: projectile.node.position.y
    })),
    score
  });

  return {
    setup: ({ scene }) => {
      root = scene.scene.createGroup();
      sceneGraph = scene.scene;
      root.name = context.i18n.t('bee-shooter.title');
      root.userData.resourceUri = context.resources.resolve('bee-shooter.projectile-config')?.uri;

      const ambientLight = scene.scene.createAmbientLight({
        color: 0xffffff,
        intensity: 0.55
      });
      const directionalLight = scene.scene.createDirectionalLight({
        color: 0xffffff,
        intensity: 1.25
      });
      directionalLight.position.set(3, 4, 5);

      player = scene.scene.createBox({
        color: 0x69d1ff,
        depth: 0.18,
        height: 0.16,
        metalness: 0.18,
        roughness: 0.38,
        width: 0.42
      });
      player.position.set(0, -1.45, 0);

      root.add(ambientLight, directionalLight, player);

      if (multiplayer?.isAvailable) {
        remotePlayer = scene.scene.createBox({
          color: 0xff8fc7,
          depth: 0.18,
          height: 0.16,
          metalness: 0.18,
          roughness: 0.38,
          width: 0.42
        });
        remotePlayer.position.set(0.36, -1.45, 0);
        root.add(remotePlayer);
      }

      if (multiplayer && multiplayerSession?.role === 'host') {
        unsubscribeInput = multiplayer.onGameMessage(beeInputChannel, (message) => {
          remoteInputByPeer.set(message.fromPeerId, message.payload as BeeInputMessage);
        });
      } else if (multiplayer && multiplayerSession?.role === 'guest') {
        unsubscribeSnapshot = multiplayer.onGameMessage(beeSnapshotChannel, (message) => {
          if (isBeeSnapshotMessage(message.payload)) {
            applySnapshot(message.payload);
          }
        });
      }

      for (let index = 0; index < 5; index += 1) {
        createEnemy(index);
      }

      scene.scene.add(root);

      return () => {
        if (!root) {
          return;
        }

        scene.scene.remove(root);
        root.dispose();

        projectiles.length = 0;
        enemies.length = 0;
        unsubscribeInput();
        unsubscribeSnapshot();
        player = undefined;
        remotePlayer = undefined;
        root = undefined;
        sceneGraph = undefined;
      };
    },
    update: ({ frame }) => {
      if (!player) {
        return;
      }

      const localInput = {
        fire: context.input.consumeActionPress('fire'),
        moveLeft: context.input.getActionValue('moveLeft'),
        moveRight: context.input.getActionValue('moveRight')
      } satisfies BeeInputMessage;

      if (multiplayerSession?.role === 'guest') {
        multiplayer?.sendGameMessage(beeInputChannel, localInput);
        return;
      }

      const movement = localInput.moveRight - localInput.moveLeft;
      player.position.x = Math.max(-1.55, Math.min(1.55, player.position.x + movement * frame.deltaMs * 0.004));

      if (localInput.fire) {
        createProjectile();
      }

      if (remotePlayer) {
        const remoteInput = [...remoteInputByPeer.values()][0];

        if (remoteInput) {
          const remoteMovement = remoteInput.moveRight - remoteInput.moveLeft;
          remotePlayer.position.x = Math.max(
            -1.55,
            Math.min(1.55, remotePlayer.position.x + remoteMovement * frame.deltaMs * 0.004)
          );

          if (remoteInput.fire) {
            createProjectile(remotePlayer.position.x);
            remoteInputByPeer.set([...remoteInputByPeer.keys()][0] ?? 'remote', {
              ...remoteInput,
              fire: false
            });
          }
        }
      }

      for (const projectile of [...projectiles]) {
        projectile.node.position.y += projectile.velocityY * frame.deltaMs;

        if (projectile.node.position.y > 1.8) {
          removeProjectile(projectile);
        }
      }

      for (const enemy of [...enemies]) {
        enemy.node.position.x += enemy.speedX * frame.deltaMs;

        if (Math.abs(enemy.node.position.x) > 1.8) {
          enemy.node.position.x *= -0.92;
        }

        for (const projectile of [...projectiles]) {
          const dx = Math.abs(projectile.node.position.x - enemy.node.position.x);
          const dy = Math.abs(projectile.node.position.y - enemy.node.position.y);

          if (dx < 0.24 && dy < 0.18) {
            score += 1;
            removeProjectile(projectile);
            removeEnemy(enemy);
            createEnemy(score % 5);
            break;
          }
        }
      }

      if (multiplayerSession?.role === 'host') {
        multiplayer?.sendGameMessage(beeSnapshotChannel, createSnapshot());
      }
    }
  };
};

export const beeShooterGameCartridge: GameCartridge<BeeShooterMessageKey> = {
  capabilities: {
    graphics: 'scene-graph-3d',
    input: 'mapped-actions',
    networking: 'p2p'
  },
  createModule: createBeeShooterModule,
  descriptionKey: 'bee-shooter.description',
  id: 'bee-shooter',
  messages: beeShooterMessages,
  resources: beeShooterResources,
  tagKeys: ['bee-shooter.tag.arcade', 'bee-shooter.tag.shooter'],
  themeColor: '#f5c542',
  titleKey: 'bee-shooter.title',
  viewport: {
    designHeight: 9,
    designWidth: 16
  }
};
