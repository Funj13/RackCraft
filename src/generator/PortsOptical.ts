import * as THREE from 'three';

export type OpticalPortKind = 'sfp' | 'sfp_plus' | 'sfp28' | 'qsfp';

export interface OpticalPortOptions {
  kind: OpticalPortKind;
  ledStatus?: boolean;
}

export function createOpticalPort(options: OpticalPortOptions): THREE.Group {
  const root = new THREE.Group();
  root.name = `Optical_${options.kind.toUpperCase()}`;

  const isQuad = options.kind === 'qsfp';

  const cageMetalMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.25,
    metalness: 0.95
  });

  const cavityDarkMat = new THREE.MeshStandardMaterial({
    color: 0x030712,
    roughness: 0.95
  });

  const width = isQuad ? 2.2 : 1.38;
  const height = 1.15;
  const depth = 0.6;

  // 1. Gaiola metálica externa (Cage niquelado)
  const cageGeo = new THREE.BoxGeometry(width, height, depth);
  const cage = new THREE.Mesh(cageGeo, cageMetalMat);
  cage.position.z = 0.1;
  root.add(cage);

  // 2. Reentrância receptora interna
  const cavityGeo = new THREE.BoxGeometry(width - 0.2, height - 0.2, depth + 0.05);
  const cavity = new THREE.Mesh(cavityGeo, cavityDarkMat);
  cavity.position.z = 0.15;
  root.add(cavity);

  // 3. Molas EMI superior e inferior
  const springBarGeo = new THREE.BoxGeometry(width - 0.1, 0.06, 0.1);
  const springTop = new THREE.Mesh(springBarGeo, cageMetalMat);
  springTop.position.set(0, height / 2 - 0.05, 0.35);
  root.add(springTop);

  const springBottom = new THREE.Mesh(springBarGeo, cageMetalMat);
  springBottom.position.set(0, -height / 2 + 0.05, 0.35);
  root.add(springBottom);

  // Divisória central se for QSFP (Quad SFP)
  if (isQuad) {
    const dividerGeo = new THREE.BoxGeometry(0.1, height - 0.2, 0.3);
    const divider = new THREE.Mesh(dividerGeo, cageMetalMat);
    divider.position.z = 0.25;
    root.add(divider);
  }

  // 4. LEDs de Atividade Óptica: Rx (Verde) e Tx (Âmbar/Azul/Roxo)
  const isLit = options.ledStatus ?? true;

  let txColor = 0xf59e0b; // Âmbar padrão
  if (options.kind === 'sfp_plus') txColor = 0x38bdf8; // Azul 10G
  if (options.kind === 'sfp28') txColor = 0x06b6d4; // Ciano 25G
  if (options.kind === 'qsfp') txColor = 0xa855f7; // Roxo 100G

  const ledRxMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: isLit ? 0x22c55e : 0x000000,
    emissiveIntensity: isLit ? 1.2 : 0.0,
    roughness: 0.2
  });

  const ledTxMat = new THREE.MeshStandardMaterial({
    color: txColor,
    emissive: isLit ? txColor : 0x000000,
    emissiveIntensity: isLit ? 1.0 : 0.0,
    roughness: 0.2
  });

  const ledGeo = new THREE.BoxGeometry(0.16, 0.12, 0.1);

  // LED Rx (Esquerdo)
  const ledRx = new THREE.Mesh(ledGeo, ledRxMat);
  ledRx.position.set(-width / 2 + 0.2, height / 2 + 0.12, 0.2);
  root.add(ledRx);

  // LED Tx (Direito)
  const ledTx = new THREE.Mesh(ledGeo, ledTxMat);
  ledTx.position.set(width / 2 - 0.2, height / 2 + 0.12, 0.2);
  root.add(ledTx);

  return root;
}

export function getOpticalBlockWidth(
  sfpCount: number,
  sfpPlusCount: number,
  sfp28Count: number,
  qsfpCount: number
): number {
  const standardCount = sfpCount + sfpPlusCount + sfp28Count;
  return standardCount * 1.6 + qsfpCount * 2.5;
}

export function createOpticalPortBlock(
  sfpCount: number,
  sfpPlusCount: number,
  sfp28Count: number,
  qsfpCount: number,
  ledStatus: boolean = true
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Optical_Ports_Block';

  const ports: OpticalPortKind[] = [];
  for (let i = 0; i < sfpCount; i++) ports.push('sfp');
  for (let i = 0; i < sfpPlusCount; i++) ports.push('sfp_plus');
  for (let i = 0; i < sfp28Count; i++) ports.push('sfp28');
  for (let i = 0; i < qsfpCount; i++) ports.push('qsfp');

  if (ports.length === 0) return group;

  const totalWidth = getOpticalBlockWidth(sfpCount, sfpPlusCount, sfp28Count, qsfpCount);
  let currentX = -totalWidth / 2;

  for (let i = 0; i < ports.length; i++) {
    const kind = ports[i];
    const port = createOpticalPort({ kind, ledStatus });
    const isQuad = kind === 'qsfp';
    const slotWidth = isQuad ? 2.5 : 1.6;

    port.position.x = currentX + slotWidth / 2;
    group.add(port);

    currentX += slotWidth;
  }

  return group;
}
