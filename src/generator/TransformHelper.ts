import * as THREE from 'three';
import { RouterConfig, ElementId, ChassisFace } from '../types/router';

export function applyElementTransform(
  obj: THREE.Object3D,
  config: RouterConfig,
  elemId: ElementId,
  baseX: number,
  baseY: number,
  baseZ: number,
  baseRotX: number = 0,
  baseRotY: number = 0,
  baseRotZ: number = 0,
  face?: ChassisFace
) {
  obj.userData.baseX = baseX;
  obj.userData.baseY = baseY;
  obj.userData.baseZ = baseZ;
  obj.userData.baseRotX = baseRotX;
  obj.userData.baseRotY = baseRotY;
  obj.userData.baseRotZ = baseRotZ;
  if (face) obj.userData.face = face;

  const off = config.offsets?.[elemId];
  if (off?.hidden) {
    obj.visible = false;
    return;
  }
  obj.visible = true;

  const offX = off?.x ?? 0;
  const offY = off?.y ?? 0;
  const offZ = off?.z ?? 0;
  const rotX = off?.rotX ?? 0;
  const rotY = off?.rotY ?? 0;
  const rotZ = off?.rotZ ?? 0;

  const isRear = face === 'rear' || obj.userData?.face === 'rear' || Boolean(obj.userData?.isRear);
  const deltaX = isRear ? -offX : offX;

  obj.position.set(baseX + deltaX, baseY + offY, baseZ + offZ);
  obj.rotation.set(baseRotX + rotX, baseRotY + rotY, baseRotZ + rotZ);

  // Escala individual do objeto
  const scale = off?.scale ?? 1.0;
  const scaleX = (off?.scaleX ?? 1.0) * scale;
  const scaleY = (off?.scaleY ?? 1.0) * scale;
  const scaleZ = (off?.scaleZ ?? 1.0) * scale;
  obj.scale.set(scaleX, scaleY, scaleZ);
}
