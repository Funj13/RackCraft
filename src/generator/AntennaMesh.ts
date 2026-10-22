import * as THREE from 'three';

export interface AntennaOptions {
  height: number;
  angle: number; // Em graus
  color: string;
}

export function createAntenna(options: AntennaOptions): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Wi-Fi_Antenna';

  const plasticMat = new THREE.MeshStandardMaterial({
    color: options.color || '#1e293b',
    roughness: 0.6,
    metalness: 0.1
  });

  const goldSmaMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b, // Latão dourado SMA
    roughness: 0.3,
    metalness: 0.85
  });

  // 1. Conector SMA roscado na base
  const smaBaseGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.4, 12);
  const smaBase = new THREE.Mesh(smaBaseGeo, goldSmaMat);
  smaBase.position.y = 0.2;
  root.add(smaBase);

  // 2. Articulação plástica giratória
  const jointGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.5, 12);
  const joint = new THREE.Mesh(jointGeo, plasticMat);
  joint.position.y = 0.6;
  root.add(joint);

  // 3. Haste móvel inclinável (pivot a partir da junta)
  const mastPivot = new THREE.Group();
  mastPivot.position.y = 0.8;
  mastPivot.rotation.z = THREE.MathUtils.degToRad(options.angle || 0);

  // Corpo cônico estendido da antena
  const h = options.height || 8;
  const mastGeo = new THREE.CylinderGeometry(0.22, 0.35, h, 8);
  const mast = new THREE.Mesh(mastGeo, plasticMat);
  mast.position.y = h / 2;
  mastPivot.add(mast);

  // Ponta arredondada/cônica da antena
  const tipGeo = new THREE.ConeGeometry(0.22, 0.4, 8);
  const tip = new THREE.Mesh(tipGeo, plasticMat);
  tip.position.y = h + 0.2;
  mastPivot.add(tip);

  root.add(mastPivot);

  return root;
}

/**
 * Cria e distribui o conjunto de antenas ao redor do chassi do roteador.
 */
export function createAntennaSet(
  count: number,
  chassisWidth: number,
  chassisDepth: number,
  chassisHeight: number,
  placement: 'rear' | 'sides' | 'rear_and_sides',
  antennaHeight: number,
  angle: number,
  color: string
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Antennas_Array';

  if (count <= 0) return group;

  const halfW = chassisWidth / 2;
  const halfD = chassisDepth / 2;
  const topY = chassisHeight / 2;

  if (placement === 'sides') {
    // Distribui nas laterais esquerda e direita
    const perSide = Math.ceil(count / 2);
    for (let i = 0; i < count; i++) {
      const isLeft = i % 2 === 0;
      const sideIndex = Math.floor(i / 2);
      const ant = createAntenna({
        height: antennaHeight,
        angle: isLeft ? -Math.abs(angle) : Math.abs(angle),
        color
      });

      const zOffset = (sideIndex - (perSide - 1) / 2) * (chassisDepth * 0.6);
      ant.position.set(isLeft ? -halfW - 0.2 : halfW + 0.2, topY - 0.5, zOffset);
      ant.rotation.y = isLeft ? -Math.PI / 2 : Math.PI / 2;
      group.add(ant);
    }
  } else {
    // Placement 'rear' padrão (na face traseira ou traseira + cantos)
    for (let i = 0; i < count; i++) {
      let antAngle = angle;
      // Dá uma abertura em leque realista se tiver mais de 2 antenas
      if (count > 2) {
        const factor = (i - (count - 1) / 2) / ((count - 1) / 2 || 1);
        antAngle = angle * factor;
      }

      const ant = createAntenna({
        height: antennaHeight,
        angle: antAngle,
        color
      });

      const xPos = count === 1 ? 0 : (i - (count - 1) / 2) * (chassisWidth * 0.75 / (count - 1));
      ant.position.set(xPos, topY - 0.2, -halfD - 0.2);
      ant.rotation.x = -Math.PI / 16; // Leve inclinação para trás
      group.add(ant);
    }
  }

  return group;
}
