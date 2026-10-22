import * as THREE from 'three';
import { ModularSlot1Type, ModularSlot2Type } from '../types/router';
import { createOpticalPort } from './PortsOptical';
import { createRJ45Port } from './PortsRJ45';

/**
 * Parafuso borboleta (Thumbscrew) característico de placas modulares Cisco C8300.
 */
function createThumbscrew(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Thumbscrew';

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.25,
    metalness: 0.95
  });

  const headGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.25, 16);
  headGeo.rotateX(Math.PI / 2);
  const head = new THREE.Mesh(headGeo, chromeMat);
  head.position.z = 0.2;
  root.add(head);

  // Ranhura da chave
  const slotGeo = new THREE.BoxGeometry(0.48, 0.08, 0.1);
  const slot = new THREE.Mesh(slotGeo, new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 }));
  slot.position.z = 0.32;
  root.add(slot);

  return root;
}

/**
 * Cria a placa base do slot (Faceplate) com altura proporcional ao chassi 1U (3.8 cm)
 * para que nunca fique menor que as portas ou sobreposta.
 */
function createSlotFaceplate(width: number, height: number = 3.8): THREE.Group {
  const root = new THREE.Group();

  const faceplateMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0, // Metal cinza claro/branco estilo Cisco
    roughness: 0.45,
    metalness: 0.7
  });

  // Chapa metálica da placa de expansão
  const plateGeo = new THREE.BoxGeometry(width, height, 0.25);
  const plate = new THREE.Mesh(plateGeo, faceplateMat);
  plate.position.z = 0.1;
  root.add(plate);

  // Rebaixo/Borda escura de contorno para destacar a gaveta modular
  const borderGeo = new THREE.BoxGeometry(width + 0.08, height + 0.08, 0.1);
  const borderMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
  const border = new THREE.Mesh(borderGeo, borderMat);
  border.position.z = 0.02;
  root.add(border);

  // Parafusos borboleta nas extremidades esquerda e direita
  const screwL = createThumbscrew();
  screwL.position.set(-width / 2 + 0.45, 0, 0.15);
  root.add(screwL);

  const screwR = createThumbscrew();
  screwR.position.set(width / 2 - 0.45, 0, 0.15);
  root.add(screwR);

  // Padrão de perfurações de ventilação nas bordas superior e inferior
  const ventMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.95 });
  const ventTopGeo = new THREE.BoxGeometry(width - 2.2, 0.1, 0.28);
  const ventTop = new THREE.Mesh(ventTopGeo, ventMat);
  ventTop.position.set(0, height / 2 - 0.28, 0.1);
  root.add(ventTop);

  const ventBottom = new THREE.Mesh(ventTopGeo, ventMat);
  ventBottom.position.set(0, -height / 2 + 0.28, 0.1);
  root.add(ventBottom);

  return root;
}

/**
 * Slot Modular 1 (Slot Médio NIM - Network Interface Module):
 * Altura completa de 3.8 cm proporcionada ao chassi de 4.4 cm.
 */
export function createModularSlot1(type: ModularSlot1Type, ledStatus: boolean = true): THREE.Group {
  const width = 10.2;
  const height = 3.8;
  const group = createSlotFaceplate(width, height);
  group.name = `Slot1_${type}`;

  if (type === 'blank') {
    return group;
  }

  if (type === 'nim_1x_10g') {
    // 1x porta 10G SFP+ à esquerda com moldura amarela fina "<-> 10G D"
    const sfpPort = createOpticalPort({ kind: 'sfp_plus', ledStatus });
    sfpPort.position.set(-width * 0.24, 0, 0.25);
    group.add(sfpPort);

    const yellowGeo = new THREE.BoxGeometry(1.6, 0.1, 0.3);
    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.5 });
    const yellowTop = new THREE.Mesh(yellowGeo, yellowMat);
    yellowTop.position.set(-width * 0.24, 0.9, 0.25);
    group.add(yellowTop);

    // Grelha perfurada metálica preenchendo a placa à direita
    const grillMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
    const grillGeo = new THREE.BoxGeometry(4.4, 2.2, 0.26);
    const grill = new THREE.Mesh(grillGeo, grillMat);
    grill.position.set(width * 0.18, 0, 0.12);
    group.add(grill);

    return group;
  }

  if (type === 'qsfp_100g') {
    const port = createOpticalPort({ kind: 'qsfp', ledStatus });
    port.position.set(0, 0, 0.25);
    group.add(port);
  } else if (type === 'dual_qsfp') {
    [-1.6, 1.6].forEach((xPos) => {
      const port = createOpticalPort({ kind: 'qsfp', ledStatus });
      port.position.set(xPos, 0, 0.25);
      group.add(port);
    });
  } else if (type === 'dual_sfp28') {
    [-1.4, 1.4].forEach((xPos) => {
      const port = createOpticalPort({ kind: 'sfp28', ledStatus });
      port.position.set(xPos, 0, 0.25);
      group.add(port);
    });
  }

  return group;
}

/**
 * Slot Modular 2 (Slot Grande SM-X - Service Module):
 * Altura completa de 3.8 cm proporcionada ao chassi de 4.4 cm.
 * Acomoda confortavelmente 20x portas RJ-45 + 2x SFP+ sem aperto.
 */
export function createModularSlot2(type: ModularSlot2Type, ledStatus: boolean = true): THREE.Group {
  const width = 21.0;
  const height = 3.8;
  const group = createSlotFaceplate(width, height);
  group.name = `Slot2_${type}`;

  if (type === 'blank') {
    return group;
  }

  if (type === 'sm_x_20rj_2sfp') {
    // 20x portas RJ-45 (16 portas GE + 4 portas MultiGE) + 2x SFP+ 10G
    const portSpacingX = 1.32;
    const portSpacingY = 1.35;
    const scaleFactor = 0.82;

    let startX = -width / 2 + 1.5;

    // 1. Bloco de 16 portas Gigabit RJ45 (2x8)
    const block16Width = 8 * portSpacingX * scaleFactor;
    for (let col = 0; col < 8; col++) {
      for (let row = 0; row < 2; row++) {
        const isTop = row === 0;
        const port = createRJ45Port({
          type: 'wan',
          ledStatus,
          isDomestic: false,
          latchPosition: isTop ? 'top' : 'bottom'
        });
        port.scale.set(scaleFactor, scaleFactor, 1);
        const xPos = startX + col * portSpacingX * scaleFactor;
        const yPos = isTop ? (portSpacingY * scaleFactor) / 2 : -(portSpacingY * scaleFactor) / 2;
        port.position.set(xPos, yPos, 0.25);
        group.add(port);
      }
    }

    // Faixa amarela embaixo das 16 portas
    const yellowStripeGeo = new THREE.BoxGeometry(block16Width - 0.2, 0.08, 0.3);
    const yellowStripe = new THREE.Mesh(yellowStripeGeo, new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.5 }));
    yellowStripe.position.set(startX + block16Width / 2 - 0.5, -height / 2 + 0.45, 0.25);
    group.add(yellowStripe);

    startX += block16Width + 0.35;

    // 2. Bloco de 4 portas Multigigabit RJ45 (2x2)
    const block4Width = 2 * portSpacingX * scaleFactor;
    for (let col = 0; col < 2; col++) {
      for (let row = 0; row < 2; row++) {
        const isTop = row === 0;
        const port = createRJ45Port({
          type: 'wan',
          ledStatus,
          isDomestic: false,
          latchPosition: isTop ? 'top' : 'bottom'
        });
        port.scale.set(scaleFactor, scaleFactor, 1);
        const xPos = startX + col * portSpacingX * scaleFactor;
        const yPos = isTop ? (portSpacingY * scaleFactor) / 2 : -(portSpacingY * scaleFactor) / 2;
        port.position.set(xPos, yPos, 0.25);
        group.add(port);
      }
    }

    // Faixa azul embaixo das 4 portas
    const blueStripeGeo = new THREE.BoxGeometry(block4Width - 0.1, 0.08, 0.3);
    const blueStripe = new THREE.Mesh(blueStripeGeo, new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.5 }));
    blueStripe.position.set(startX + block4Width / 2 - 0.5, -height / 2 + 0.45, 0.25);
    group.add(blueStripe);

    startX += block4Width + 0.45;

    // 3. Bloco de 2 portas 10G SFP+ empilhadas verticalmente (2x1)
    for (let row = 0; row < 2; row++) {
      const sfp = createOpticalPort({ kind: 'sfp_plus', ledStatus });
      sfp.scale.set(scaleFactor, scaleFactor, 1);
      const yPos = row === 0 ? (portSpacingY * scaleFactor) / 2 : -(portSpacingY * scaleFactor) / 2;
      sfp.position.set(startX, yPos, 0.25);
      group.add(sfp);
    }

    // 4. Puxador / Alavanca ejetora na extrema direita da placa SM-X
    const ejectorGeo = new THREE.BoxGeometry(0.35, 2.2, 0.35);
    const ejectorMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const ejector = new THREE.Mesh(ejectorGeo, ejectorMat);
    ejector.position.set(width / 2 - 0.8, 0, 0.25);
    group.add(ejector);

    return group;
  }

  if (type === 'rj45_8p') {
    const spacingX = 1.62;
    const spacingY = 1.35;
    for (let i = 0; i < 8; i++) {
      const col = Math.floor(i / 2);
      const row = i % 2;
      const isTop = row === 0;
      const port = createRJ45Port({
        type: 'lan',
        ledStatus,
        isDomestic: false,
        latchPosition: isTop ? 'top' : 'bottom'
      });
      const xPos = (col - 1.5) * spacingX;
      const yPos = isTop ? spacingY / 2 : -spacingY / 2;
      port.position.set(xPos, yPos, 0.25);
      group.add(port);
    }
  } else if (type === 'sfp_plus_4p') {
    const spacingX = 1.8;
    for (let i = 0; i < 4; i++) {
      const port = createOpticalPort({ kind: 'sfp_plus', ledStatus });
      port.position.set((i - 1.5) * spacingX, 0, 0.25);
      group.add(port);
    }
  } else if (type === 'sfp28_4p') {
    const spacingX = 1.8;
    for (let i = 0; i < 4; i++) {
      const port = createOpticalPort({ kind: 'sfp28', ledStatus });
      port.position.set((i - 1.5) * spacingX, 0, 0.25);
      group.add(port);
    }
  } else if (type === 'combo_4rj_2sfp') {
    [-3.2, -1.6].forEach((xCol) => {
      [0.6, -0.6].forEach((yRow) => {
        const isTop = yRow > 0;
        const port = createRJ45Port({
          type: 'lan',
          ledStatus,
          isDomestic: false,
          latchPosition: isTop ? 'top' : 'bottom'
        });
        port.position.set(xCol, yRow, 0.25);
        group.add(port);
      });
    });

    [1.5, 3.3].forEach((xPos) => {
      const port = createOpticalPort({ kind: 'sfp_plus', ledStatus });
      port.position.set(xPos, 0, 0.25);
      group.add(port);
    });
  }

  return group;
}
