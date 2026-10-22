import * as THREE from 'three';

export interface PowerConnectorOptions {
  type: 'iec_c14' | 'dc_barrel' | 'dual_iec_c14' | 'dual_dc_barrel' | 'hot_swap_psu' | 'dual_hot_swap_psu' | 'none';
  hasSwitch?: boolean;
}

export function getPowerBlockWidth(
  type: PowerConnectorOptions['type']
): number {
  if (type === 'none') return 0;
  if (type === 'hot_swap_psu') return 8.6;
  if (type === 'dual_hot_swap_psu') return 18.0;
  if (type === 'iec_c14') return 2.6;
  if (type === 'dual_iec_c14') return 6.0;
  if (type === 'dc_barrel') return 1.4;
  if (type === 'dual_dc_barrel') return 3.0;
  return 0;
}

export function createPowerConnectorGroup(options: PowerConnectorOptions): THREE.Group {
  const group = new THREE.Group();
  group.name = 'PowerConnectors';

  if (options.type === 'none') return group;

  if (options.type === 'iec_c14' || options.type === 'dual_iec_c14') {
    const count = options.type === 'dual_iec_c14' ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const conn = createIECC14Mesh();
      conn.position.x = (i - (count - 1) / 2) * 3.2;
      group.add(conn);
    }
  } else if (options.type === 'dc_barrel' || options.type === 'dual_dc_barrel') {
    const count = options.type === 'dual_dc_barrel' ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const conn = createDCBarrelMesh();
      conn.position.x = (i - (count - 1) / 2) * 1.6;
      group.add(conn);
    }
  }

  return group;
}

/**
 * Cria um conector IEC C14 de 3 pinos estilo computador de mesa / servidor.
 */
function createIECC14Mesh(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'IEC_C14';

  const blackPlasticMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.8,
    metalness: 0.1
  });

  const pinMetalMat = new THREE.MeshStandardMaterial({
    color: 0xd1d5db,
    roughness: 0.25,
    metalness: 0.95
  });

  const socketGeo = new THREE.BoxGeometry(2.4, 1.8, 0.4);
  const socketMesh = new THREE.Mesh(socketGeo, blackPlasticMat);
  socketMesh.position.z = 0.1;
  root.add(socketMesh);

  const cavityGeo = new THREE.BoxGeometry(2.0, 1.4, 0.5);
  const cavityMat = new THREE.MeshStandardMaterial({
    color: 0x030712,
    roughness: 0.95,
    metalness: 0.05
  });
  const cavityMesh = new THREE.Mesh(cavityGeo, cavityMat);
  cavityMesh.position.z = 0.15;
  root.add(cavityMesh);

  const pinGeo = new THREE.BoxGeometry(0.12, 0.35, 0.5);

  const pinEarth = new THREE.Mesh(pinGeo, pinMetalMat);
  pinEarth.position.set(0, 0.25, 0.3);
  root.add(pinEarth);

  const pinLive = new THREE.Mesh(pinGeo, pinMetalMat);
  pinLive.position.set(-0.55, -0.25, 0.3);
  root.add(pinLive);

  const pinNeutral = new THREE.Mesh(pinGeo, pinMetalMat);
  pinNeutral.position.set(0.55, -0.25, 0.3);
  root.add(pinNeutral);

  return root;
}

function createDCBarrelMesh(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'DC_Barrel_Jack';

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.2,
    metalness: 0.9
  });

  const innerHoleMat = new THREE.MeshStandardMaterial({
    color: 0x09090b,
    roughness: 0.95,
    metalness: 0.0
  });

  const centerPinMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.3,
    metalness: 0.8
  });

  const outerRingGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.4, 16);
  outerRingGeo.rotateX(Math.PI / 2);
  const outerRing = new THREE.Mesh(outerRingGeo, chromeMat);
  outerRing.position.z = 0.1;
  root.add(outerRing);

  const innerHoleGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.45, 16);
  innerHoleGeo.rotateX(Math.PI / 2);
  const innerHole = new THREE.Mesh(innerHoleGeo, innerHoleMat);
  innerHole.position.z = 0.15;
  root.add(innerHole);

  const pinGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.55, 12);
  pinGeo.rotateX(Math.PI / 2);
  const pinMesh = new THREE.Mesh(pinGeo, centerPinMat);
  pinMesh.position.z = 0.25;
  root.add(pinMesh);

  return root;
}

function createRockerSwitchMesh(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Rocker_Switch';

  const housingGeo = new THREE.BoxGeometry(1.2, 1.8, 0.3);
  const housingMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8 });
  const housing = new THREE.Mesh(housingGeo, housingMat);
  housing.position.z = 0.1;
  root.add(housing);

  const rockerGeo = new THREE.BoxGeometry(0.8, 1.3, 0.35);
  const rockerMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 });
  const rocker = new THREE.Mesh(rockerGeo, rockerMat);
  rocker.position.z = 0.22;
  rocker.rotation.x = 0.15;
  root.add(rocker);

  return root;
}

function createToggleSwitchMesh(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Push_Power_Switch';

  const baseGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.25, 16);
  baseGeo.rotateX(Math.PI / 2);
  const base = new THREE.Mesh(baseGeo, new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.6 }));
  base.position.z = 0.1;
  root.add(base);

  const buttonGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.45, 16);
  buttonGeo.rotateX(Math.PI / 2);
  const button = new THREE.Mesh(buttonGeo, new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.4 }));
  button.position.z = 0.25;
  root.add(button);

  return root;
}

/**
 * Cria a Chave Liga/Desliga como módulo autônomo e reposicionável livremente
 */
export function createPowerSwitchModule(isOn: boolean = true): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Element_Power_Switch';
  root.userData = {
    isSelectable: true,
    elementId: 'power_switch',
    elementName: 'Chave Liga/Desliga',
    baseX: 0,
    baseY: 0,
    isRear: true
  };

  // 1. Moldura chanfrada de montagem (bezel de plástico industrial)
  const bezelGeo = new THREE.BoxGeometry(1.5, 2.2, 0.35);
  const bezelMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.7,
    metalness: 0.2
  });
  const bezel = new THREE.Mesh(bezelGeo, bezelMat);
  bezel.position.z = 0.12;
  root.add(bezel);

  // 2. Cavidade interna escura
  const cavityGeo = new THREE.BoxGeometry(1.15, 1.75, 0.4);
  const cavityMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.95 });
  const cavity = new THREE.Mesh(cavityGeo, cavityMat);
  cavity.position.z = 0.18;
  root.add(cavity);

  // 3. Chave gangorra vermelha iluminada (Rocker Switch)
  const rockerGeo = new THREE.BoxGeometry(0.92, 1.45, 0.4);
  const rockerMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.35,
    metalness: 0.1,
    emissive: isOn ? 0xdc2626 : 0x000000,
    emissiveIntensity: isOn ? 0.35 : 0.0
  });
  const rocker = new THREE.Mesh(rockerGeo, rockerMat);
  rocker.position.z = 0.28;
  rocker.rotation.x = isOn ? 0.2 : -0.2; // Inclinação realista de ligada/desligada
  root.add(rocker);

  // 4. Marcações brancas I (Ligado) e O (Desligado)
  const markMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });

  const markGeoI = new THREE.BoxGeometry(0.08, 0.32, 0.05);
  const markI = new THREE.Mesh(markGeoI, markMat);
  markI.position.set(0, 0.36, 0.44);
  root.add(markI);

  const markGeoO = new THREE.RingGeometry(0.09, 0.15, 12);
  const markO = new THREE.Mesh(markGeoO, markMat);
  markO.position.set(0, -0.36, 0.44);
  root.add(markO);

  return root;
}
