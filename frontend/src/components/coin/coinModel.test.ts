// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { Box3, Group, Mesh, MeshStandardMaterial } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { beforeEach, describe, expect, it } from 'vitest';
import { prepareCoinModel } from './coinModel';

describe('prepareCoinModel', () => {
  let model: Group;
  beforeEach(async () => {
    const bytes = readFileSync(new URL('../../../../brand/dayuse-coin/dayuse-coin.glb', import.meta.url));
    model = (await new GLTFLoader().parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '',
    )).scene;
  });

  it('법선이 없는 실제 GLB에 유효한 단위 법선을 만들고 모델 크기는 보존한다', () => {
    const bounds = new Box3().setFromObject(model);
    prepareCoinModel(model);
    expect(new Box3().setFromObject(model)).toEqual(bounds);
    model.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const normals = object.geometry.getAttribute('normal');
      expect(normals.count).toBe(object.geometry.getAttribute('position').count);
      for (let i = 0; i < normals.count; i++) {
        expect(Math.hypot(normals.getX(i), normals.getY(i), normals.getZ(i))).toBeCloseTo(1, 4);
      }
    });
  });

  it('양각의 정면은 평평하게 유지하고 금속 반사의 거친 면 구분을 제거한다', () => {
    prepareCoinModel(model);
    const relief = model.getObjectByName('relief_front_dayu');
    expect(relief).toBeInstanceOf(Mesh);
    if (!(relief instanceof Mesh)) throw new Error('Missing coin relief');
    const positions = relief.geometry.getAttribute('position');
    const normals = relief.geometry.getAttribute('normal');
    let capVertices = 0;
    for (let i = 0; i < positions.count; i += 3) {
      // The front cap of the supplied model is at Z=0.056.
      if ([0, 1, 2].every(offset => positions.getZ(i + offset) > 0.0559)) {
        capVertices += 3;
        for (let offset = 0; offset < 3; offset++) expect(normals.getZ(i + offset)).toBeCloseTo(1, 4);
      }
    }
    expect(capVertices).toBeGreaterThan(0);
    expect(relief.material.flatShading).toBe(false);
  });

  it('양각을 바탕과 구별되는 새틴 골드로 표시하며 반복 준비로 색을 누적 변경하지 않는다', () => {
    prepareCoinModel(model);
    const colors = new Map<string, number>();
    model.traverse((object) => {
      if (!(object instanceof Mesh) || !(object.material instanceof MeshStandardMaterial)) return;
      colors.set(object.material.name, object.material.color.getHex());
      expect(object.material.roughness).toBeGreaterThanOrEqual(0.42);
      expect(object.material.envMapIntensity).toBeLessThanOrEqual(1);
    });
    expect(colors.get('gold')).toBe(0x80551f);
    expect(colors.get('gold')).not.toBe(colors.get('field_theme'));
    prepareCoinModel(model);
    model.traverse((object) => {
      if (object instanceof Mesh && object.material instanceof MeshStandardMaterial) {
        expect(object.material.color.getHex()).toBe(colors.get(object.material.name));
      }
    });
  });
});
