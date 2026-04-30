import type { GraphicsNode, GraphicsRenderScene, GraphicsSceneNode, GraphicsVector3 } from '@game-forge/graphics';

const createVector = (): GraphicsVector3 => ({
  x: 0,
  y: 0,
  z: 0,
  set(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
});

class TestGraphicsNode implements GraphicsNode {
  readonly children: GraphicsNode[] = [];
  name = '';
  readonly position = createVector();
  readonly rotation = createVector();
  readonly userData: Record<string, unknown> = {};
  isDisposed = false;

  add(...nodes: readonly GraphicsNode[]) {
    this.children.push(...nodes);
  }

  clear() {
    this.children.length = 0;
  }

  dispose() {
    this.isDisposed = true;

    for (const child of this.children) {
      child.dispose();
    }

    this.clear();
  }

  remove(...nodes: readonly GraphicsNode[]) {
    for (const node of nodes) {
      const index = this.children.indexOf(node);

      if (index >= 0) {
        this.children.splice(index, 1);
      }
    }
  }
}

class TestGraphicsSceneNode extends TestGraphicsNode implements GraphicsSceneNode {
  createAmbientLight(): GraphicsNode {
    return new TestGraphicsNode();
  }

  createBox(): GraphicsNode {
    return new TestGraphicsNode();
  }

  createDirectionalLight(): GraphicsNode {
    return new TestGraphicsNode();
  }

  createGroup(): GraphicsNode {
    return new TestGraphicsNode();
  }

  createSphere(): GraphicsNode {
    return new TestGraphicsNode();
  }
}

export const createTestGraphicsScene = (): GraphicsRenderScene => ({
  scene: new TestGraphicsSceneNode(),
  viewport: {
    dpr: 1,
    height: 320,
    width: 480
  }
});
