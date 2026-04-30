import { createTranslationCatalog } from '@game-forge/i18n';
import type { ResourceRecord } from '@game-forge/resources';
import type { GameCartridge, GameCartridgeContext } from '@game-forge/game-cartridge';
import type { ThreeRenderScene } from '@game-forge/graphics';
import type { RuntimeModule } from '@game-forge/runtime';

import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry
} from 'three';

export const beeShooterMessages = createTranslationCatalog({
  'en-US': {
    'bee-shooter.description': 'A compact arcade shooter for testing movement, shots, collisions, and score.',
    'bee-shooter.tag.arcade': 'Arcade',
    'bee-shooter.tag.shooter': 'Shooter',
    'bee-shooter.title': 'Bee Shooter'
  },
  'zh-CN': {
    'bee-shooter.description': '用于测试移动、射击、碰撞和计分的小型街机射击游戏。',
    'bee-shooter.tag.arcade': '街机',
    'bee-shooter.tag.shooter': '射击',
    'bee-shooter.title': '小蜜蜂射击'
  }
});

export type BeeShooterMessageKey = keyof typeof beeShooterMessages['en-US'];

export const beeShooterResources = [
  {
    key: 'bee-shooter.player-marker',
    kind: 'image',
    preload: true,
    uri: new URL('../assets/player-marker.svg', import.meta.url).href
  },
  {
    key: 'bee-shooter.projectile-config',
    kind: 'json',
    priority: 'critical',
    uri: new URL('../assets/projectile-config.json', import.meta.url).href
  }
] satisfies readonly ResourceRecord[];

interface Projectile {
  readonly mesh: Mesh<SphereGeometry, MeshStandardMaterial>;
  readonly velocityY: number;
}

interface Enemy {
  readonly mesh: Mesh<BoxGeometry, MeshStandardMaterial>;
  readonly speedX: number;
}

const disposeMesh = (mesh: Mesh) => {
  mesh.geometry.dispose();

  if (Array.isArray(mesh.material)) {
    for (const material of mesh.material) {
      material.dispose();
    }
    return;
  }

  mesh.material.dispose();
};

export const createBeeShooterModule = (
  context: GameCartridgeContext<BeeShooterMessageKey>
): RuntimeModule<ThreeRenderScene> => {
  const root = new Group();
  root.name = context.i18n.t('bee-shooter.title');
  root.userData.resourceUri = context.resources.resolve('bee-shooter.projectile-config')?.uri;
  const projectiles: Projectile[] = [];
  const enemies: Enemy[] = [];
  let player: Mesh<BoxGeometry, MeshStandardMaterial> | undefined;
  let spawnElapsedMs = 0;
  let score = 0;

  const createProjectile = () => {
    const mesh = new Mesh(
      new SphereGeometry(0.06, 12, 8),
      new MeshStandardMaterial({
        color: 0xfff06a,
        emissive: new Color(0x4a3900)
      })
    );
    mesh.position.set(player?.position.x ?? 0, -1.2, 0);
    root.add(mesh);
    projectiles.push({
      mesh,
      velocityY: 0.018
    });
  };

  const createEnemy = (index: number) => {
    const mesh = new Mesh(
      new BoxGeometry(0.32, 0.2, 0.12),
      new MeshStandardMaterial({
        color: 0x59ffcf,
        metalness: 0.1,
        roughness: 0.4
      })
    );
    mesh.position.set(-1.6 + index * 0.8, 1.05 + (index % 2) * 0.28, 0);
    root.add(mesh);
    enemies.push({
      mesh,
      speedX: index % 2 === 0 ? 0.006 : -0.006
    });
  };

  const removeProjectile = (projectile: Projectile) => {
    root.remove(projectile.mesh);
    disposeMesh(projectile.mesh);
    projectiles.splice(projectiles.indexOf(projectile), 1);
  };

  const removeEnemy = (enemy: Enemy) => {
    root.remove(enemy.mesh);
    disposeMesh(enemy.mesh);
    enemies.splice(enemies.indexOf(enemy), 1);
  };

  return {
    setup: ({ scene }) => {
      const ambientLight = new AmbientLight(0xffffff, 0.55);
      const directionalLight = new DirectionalLight(0xffffff, 1.25);
      directionalLight.position.set(3, 4, 5);

      player = new Mesh(
        new BoxGeometry(0.42, 0.16, 0.18),
        new MeshStandardMaterial({
          color: 0x69d1ff,
          metalness: 0.18,
          roughness: 0.38
        })
      );
      player.position.set(0, -1.45, 0);

      root.add(ambientLight, directionalLight, player);

      for (let index = 0; index < 5; index += 1) {
        createEnemy(index);
      }

      createProjectile();
      scene.scene.add(root);

      return () => {
        scene.scene.remove(root);
        root.clear();

        if (player) {
          disposeMesh(player);
        }

        for (const projectile of [...projectiles]) {
          disposeMesh(projectile.mesh);
        }

        for (const enemy of [...enemies]) {
          disposeMesh(enemy.mesh);
        }

        projectiles.length = 0;
        enemies.length = 0;
        player = undefined;
      };
    },
    update: ({ frame }) => {
      if (!player) {
        return;
      }

      player.position.x = Math.sin(frame.elapsedMs * 0.0014) * 1.35;
      spawnElapsedMs += frame.deltaMs;

      if (spawnElapsedMs >= 480) {
        spawnElapsedMs = 0;
        createProjectile();
      }

      for (const projectile of [...projectiles]) {
        projectile.mesh.position.y += projectile.velocityY * frame.deltaMs;

        if (projectile.mesh.position.y > 1.8) {
          removeProjectile(projectile);
        }
      }

      for (const enemy of [...enemies]) {
        enemy.mesh.position.x += enemy.speedX * frame.deltaMs;

        if (Math.abs(enemy.mesh.position.x) > 1.8) {
          enemy.mesh.position.x *= -0.92;
        }

        for (const projectile of [...projectiles]) {
          const dx = Math.abs(projectile.mesh.position.x - enemy.mesh.position.x);
          const dy = Math.abs(projectile.mesh.position.y - enemy.mesh.position.y);

          if (dx < 0.24 && dy < 0.18) {
            score += 1;
            removeProjectile(projectile);
            removeEnemy(enemy);
            createEnemy(score % 5);
            break;
          }
        }
      }
    }
  };
};

export const beeShooterGameCartridge: GameCartridge<BeeShooterMessageKey> = {
  capabilities: {
    graphics: 'three',
    input: 'keyboard',
    networking: 'none'
  },
  createModule: createBeeShooterModule,
  descriptionKey: 'bee-shooter.description',
  id: 'bee-shooter',
  messages: beeShooterMessages,
  resources: beeShooterResources,
  tagKeys: ['bee-shooter.tag.arcade', 'bee-shooter.tag.shooter'],
  themeColor: '#f5c542',
  titleKey: 'bee-shooter.title'
};
