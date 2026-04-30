import type { GraphicsNode, GraphicsRenderScene } from '@game-forge/graphics';
import type { RuntimeModule } from '@game-forge/runtime';

export const createGameModule = (): RuntimeModule<GraphicsRenderScene> => {
  let cube: GraphicsNode | undefined;

  return {
    setup: ({ scene: renderScene }) => {
      const ambientLight = renderScene.scene.createAmbientLight({
        color: 0xffffff,
        intensity: 0.55
      });
      const directionalLight = renderScene.scene.createDirectionalLight({
        color: 0xffffff,
        intensity: 1.15
      });
      directionalLight.position.set(3, 2, 4);

      cube = renderScene.scene.createBox({
        color: 0x48b2ff,
        depth: 1,
        height: 1,
        metalness: 0.2,
        roughness: 0.35,
        width: 1
      });

      renderScene.scene.add(ambientLight, directionalLight, cube);

      return () => {
        cube?.dispose();
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
