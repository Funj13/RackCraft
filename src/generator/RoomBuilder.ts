import * as THREE from 'three';
import { RoomConfig } from '../types/room';

// All geometry uses centimeters. The shared GLB exporter converts to meters.
export function buildRoom(c: RoomConfig, cutaway = false): THREE.Group {
  const root = new THREE.Group();
  root.name = c.name;
  const materials = Object.fromEntries(Object.entries(c.colors).map(([key, color]) => [key,
    new THREE.MeshStandardMaterial({ name: key, color, roughness: key === 'glass' ? 0.2 : 0.85, metalness: 0 })
  ]));
  const box = (parent: THREE.Object3D, name: string, w: number, h: number, d: number, x: number, y: number, z: number, material: string) => {
    if (w <= 0 || h <= 0 || d <= 0) return;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), materials[material]);
    mesh.name = name; mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true;
    parent.add(mesh);
  };
  const { width: w, depth: d, height: h, wallThickness: t } = c;
  box(root, 'Piso', w + 2*t, c.floorThickness, d + 2*t, 0, -c.floorThickness/2, 0, 'floor');
  if (c.ceiling && !cutaway) box(root, 'Teto', w+2*t, t, d+2*t, 0, h+t/2, 0, 'ceiling');
  for (const side of ['front', 'back', 'left', 'right'] as const) {
    if (!c.walls[side] || (cutaway && (side === 'front' || side === 'right'))) continue;
    const wall = new THREE.Group(); wall.name = `Parede_${side}`;
    const sideways = side === 'left' || side === 'right';
    const length = sideways ? d + 2*t : w;
    wall.position.set(side === 'left' ? -(w+t)/2 : side === 'right' ? (w+t)/2 : 0, 0,
      side === 'front' ? (d+t)/2 : side === 'back' ? -(d+t)/2 : 0);
    if (sideways) wall.rotation.y = Math.PI/2;
    root.add(wall);
    const door = side === 'front' && c.door.enabled;
    const window = side === 'back' && c.window.enabled;
    const opening = door ? c.door : window ? c.window : null;
    if (opening) {
      const ow = opening.width, oh = opening.height, sill = window ? c.window.sill : 0;
      const segment = (length-ow)/2;
      box(wall, 'Lateral_E', segment, h, t, -(ow+segment)/2, h/2, 0, 'wall');
      box(wall, 'Lateral_D', segment, h, t, (ow+segment)/2, h/2, 0, 'wall');
      box(wall, 'Verga', ow, h-sill-oh, t, 0, (h+sill+oh)/2, 0, 'wall');
      box(wall, 'Peitoril', ow, sill, t, 0, sill/2, 0, 'wall');
      for (const x of [-ow/2+2, ow/2-2]) box(wall, 'Batente', 4, oh, t+2, x, sill+oh/2, 0, 'trim');
      box(wall, 'Moldura_superior', ow, 4, t+2, 0, sill+oh-2, 0, 'trim');
      if (window) {
        box(wall, 'Moldura_inferior', ow, 4, t+2, 0, sill+2, 0, 'trim');
        box(wall, 'Vidro', ow-8, oh-8, 1, 0, sill+oh/2, 0, 'glass');
        box(wall, 'Montante', 4, oh-8, 4, 0, sill+oh/2, 0, 'trim');
      } else {
        const pivot = new THREE.Group(); pivot.name = 'Porta_articulada'; pivot.position.x = -ow/2+4;
        if (c.door.open) pivot.rotation.y = -Math.PI/2;
        wall.add(pivot);
        box(pivot, 'Folha_porta', ow-8, oh-6, 4, (ow-8)/2, oh/2, 0, 'door');
        box(pivot, 'Macaneta', 10, 3, 8, ow-20, 100, 0, 'trim');
      }
    } else box(wall, 'Painel', length, h, t, 0, h/2, 0, 'wall');
  }
  return root;
}

export function disposeModel(root: THREE.Object3D) {
  const materials = new Set<THREE.Material>();
  root.traverse(object => {
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose();
      (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => materials.add(m));
    }
  });
  materials.forEach(material => material.dispose());
}
