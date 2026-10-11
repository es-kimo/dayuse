import { Mesh, MeshStandardMaterial, type Group } from 'three';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';

export function prepareCoinModel(model: Group) {
  model.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    // The GLB omits normals. Smooth curved surfaces without rounding the relief's sharp edges.
    if (!object.geometry.hasAttribute('normal')) {
      const original = object.geometry;
      object.geometry = toCreasedNormals(original, Math.PI / 6);
      original.dispose();
    }
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!(material instanceof MeshStandardMaterial)) continue;
      material.flatShading = false;
      material.roughness = Math.max(material.roughness, 0.42);
      material.envMapIntensity = 0.85;
      if (material.name === 'gold') {
        // Match the dark-gold relief in the supplied PNG, even under a bright studio environment.
        material.color.set('#80551f');
        material.metalness = 0.65;
        material.roughness = 0.48;
      }
      material.needsUpdate = true;
    }
  });
}
