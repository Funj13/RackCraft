import * as THREE from 'three';

/**
 * Aplica coordenadas UV limpas na geometria de caixa do gabinete,
 * alinhando cada face exatamente com as regiões do atlas de textura.
 */
export function applyRouterBoxUVs(
  geometry: THREE.BufferGeometry,
  regions: {
    top: { x: number; y: number; width: number; height: number };
    front: { x: number; y: number; width: number; height: number };
    back: { x: number; y: number; width: number; height: number };
    bottom: { x: number; y: number; width: number; height: number };
    left: { x: number; y: number; width: number; height: number };
    right: { x: number; y: number; width: number; height: number };
  },
  textureSize: number
) {
  const uvAttr = geometry.getAttribute('uv');
  if (!uvAttr) return;

  const toUV = (r: { x: number; y: number; width: number; height: number }) => {
    const u0 = r.x / textureSize;
    const u1 = (r.x + r.width) / textureSize;
    // No canvas, Y=0 é o topo. No Three.js UV, V=1 é o topo.
    const v0 = 1 - (r.y + r.height) / textureSize;
    const v1 = 1 - r.y / textureSize;
    return { u0, u1, v0, v1 };
  };

  const reg = {
    right: toUV(regions.right),   // +X Face (0..3)
    left: toUV(regions.left),     // -X Face (4..7)
    top: toUV(regions.top),       // +Y Face (8..11)
    bottom: toUV(regions.bottom), // -Y Face (12..15)
    front: toUV(regions.front),   // +Z Face (16..19)
    back: toUV(regions.back),     // -Z Face (20..23)
  };

  const facesOrder = [
    reg.right,
    reg.left,
    reg.top,
    reg.bottom,
    reg.front,
    reg.back,
  ];

  const uvs = uvAttr.array as Float32Array;
  for (let i = 0; i < 6; i++) {
    const f = facesOrder[i];
    const offset = i * 8; // 4 vértices por face * 2 coords UV

    // Vertices order standard BoxGeometry: [ (0,1), (1,1), (0,0), (1,0) ]
    uvs[offset + 0] = f.u0;
    uvs[offset + 1] = f.v1;

    uvs[offset + 2] = f.u1;
    uvs[offset + 3] = f.v1;

    uvs[offset + 4] = f.u0;
    uvs[offset + 5] = f.v0;

    uvs[offset + 6] = f.u1;
    uvs[offset + 7] = f.v0;
  }

  uvAttr.needsUpdate = true;
}
