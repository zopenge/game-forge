import { AmbientLight, BoxGeometry, DirectionalLight, Mesh, MeshStandardMaterial } from 'three';

import type { ThreeRenderScene } from '@game-forge/graphics';
import type { RuntimeModule } from '@game-forge/runtime';

export const createGameModule = (): RuntimeModule<ThreeRenderScene> => {
  let cube: Mesh<BoxGeometry, MeshStandardMaterial> | undefined;

  return {
    setup: ({ scene: renderScene }) => {
      const ambientLight = new AmbientLight(0xffffff, 0.55);
      const directionalLight = new DirectionalLight(0xffffff, 1.15);
      directionalLight.position.set(3, 2, 4);

      cube = new Mesh(
        new BoxGeometry(1, 1, 1),
        new MeshStandardMaterial({
          color: 0x48b2ff,
          metalness: 0.2,
          roughness: 0.35
        })
      );

      renderScene.scene.add(ambientLight, directionalLight, cube);

      return () => {
        cube?.geometry.dispose();
        cube?.material.dispose();
        renderScene.scene.remove(ambientLight, directionalLight, cube!);
      };
    },
    update: ({ frame }) => {
      if (!cube) {
        return;
      }

      cube.rotation.x += frame.deltaMs * 0.0011;
      cube.rotation.y += frame.deltaMs * 0.0015;
    }
  };
};
