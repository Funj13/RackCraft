import * as THREE from 'three';

export interface FrontPanelOptions {
  width: number;
  height: number;
  depth: number;
  ledCount: number;
  ledStatus: boolean;
  hasResetHole: boolean;
  hasWpsButton: boolean;
  hasOledScreen: boolean;
  hasUsb?: boolean;
}

/**
 * Cria porta USB 3.0 metálica com interior azul (igual ao switch MikroTik da foto)
 */
export function createUSBPort(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'USB_3_Port';

  const metalMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.3,
    metalness: 0.95
  });

  const blueTabMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7, // Azul USB 3.0
    roughness: 0.4
  });

  const cavityMat = new THREE.MeshStandardMaterial({
    color: 0x030712,
    roughness: 0.95
  });

  // Moldura metálica externa
  const frameGeo = new THREE.BoxGeometry(1.4, 0.65, 0.5);
  const frame = new THREE.Mesh(frameGeo, metalMat);
  frame.position.z = 0.1;
  root.add(frame);

  // Cavidade escura interna
  const cavityGeo = new THREE.BoxGeometry(1.2, 0.48, 0.55);
  const cavity = new THREE.Mesh(cavityGeo, cavityMat);
  cavity.position.z = 0.15;
  root.add(cavity);

  // Lingueta plástica azul do USB 3.0
  const tabGeo = new THREE.BoxGeometry(1.1, 0.15, 0.35);
  const tab = new THREE.Mesh(tabGeo, blueTabMat);
  tab.position.set(0, -0.12, 0.25);
  root.add(tab);

  return root;
}

export function createFrontPanelDetails(options: FrontPanelOptions): THREE.Group {
  const root = new THREE.Group();
  root.name = 'FrontPanel_Elements';

  const zPos = options.depth / 2 + 0.05;

  // 1. Matriz de LEDs indicadores frontais de status
  if (options.ledCount > 0) {
    const ledGroup = new THREE.Group();
    ledGroup.name = 'Status_LEDs';

    const ledColors = [
      0x22c55e, // Verde (Power)
      0x38bdf8, // Ciano (Internet/WAN)
      0x22c55e, // Verde (LAN 1)
      0x22c55e, // Verde (LAN 2)
      0x38bdf8, // Azul (Wi-Fi 2.4)
      0xa855f7, // Roxo (Wi-Fi 5)
      0xf59e0b, // Laranja (Alert)
    ];

    const spacing = 0.55;
    for (let i = 0; i < options.ledCount; i++) {
      const col = ledColors[i % ledColors.length];
      const ledMat = new THREE.MeshStandardMaterial({
        color: col,
        emissive: options.ledStatus ? col : 0x000000,
        emissiveIntensity: options.ledStatus ? 1.0 : 0.0,
        roughness: 0.2
      });

      const ledGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.1, 12);
      ledGeo.rotateX(Math.PI / 2);
      const led = new THREE.Mesh(ledGeo, ledMat);
      led.position.x = (i - (options.ledCount - 1) / 2) * spacing;
      led.position.y = 0.3;
      ledGroup.add(led);

      const bezelGeo = new THREE.RingGeometry(0.1, 0.14, 12);
      const bezel = new THREE.Mesh(bezelGeo, new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.8 }));
      bezel.position.copy(led.position);
      bezel.position.z += 0.06;
      ledGroup.add(bezel);
    }

    ledGroup.position.set(-options.width * 0.42, 0, zPos);
    root.add(ledGroup);
  }

  // 2. Furinho de Reset
  if (options.hasResetHole) {
    const resetHoleGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.2, 12);
    resetHoleGeo.rotateX(Math.PI / 2);
    const resetHole = new THREE.Mesh(
      resetHoleGeo,
      new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 1.0 })
    );
    resetHole.position.set(-options.width * 0.42, -0.4, zPos);
    root.add(resetHole);
  }

  // 3. Botão WPS
  if (options.hasWpsButton) {
    const wpsBtnGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.15, 16);
    wpsBtnGeo.rotateX(Math.PI / 2);
    const wpsBtn = new THREE.Mesh(
      wpsBtnGeo,
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5 })
    );
    wpsBtn.position.set(-options.width * 0.42 + 1.2, -0.3, zPos);
    root.add(wpsBtn);
  }

  // 4. Tela OLED frontal
  if (options.hasOledScreen) {
    const screenGeo = new THREE.BoxGeometry(3.5, 1.8, 0.1);
    const screenMat = new THREE.MeshStandardMaterial({
      color: 0x020617,
      roughness: 0.1,
      metalness: 0.8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.2
    });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(-options.width * 0.35, 0, zPos);
    root.add(screen);
  }

  return root;
}

export function createRackEars(width: number, height: number): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Rack_Ears';

  const earMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.4,
    metalness: 0.9
  });

  const holeMat = new THREE.MeshStandardMaterial({
    color: 0x020617,
    roughness: 0.9
  });

  const earWidth = 2.0;
  const earThickness = 0.25;

  const createEar = (isRight: boolean) => {
    const earGroup = new THREE.Group();

    const plateGeo = new THREE.BoxGeometry(earWidth, height * 0.9, earThickness);
    const plate = new THREE.Mesh(plateGeo, earMat);
    earGroup.add(plate);

    const holeGeo = new THREE.CylinderGeometry(0.2, 0.2, earThickness + 0.05, 12);
    holeGeo.rotateX(Math.PI / 2);

    const holeTop = new THREE.Mesh(holeGeo, holeMat);
    holeTop.position.set(isRight ? 0.3 : -0.3, height * 0.3, 0);
    earGroup.add(holeTop);

    const holeBottom = new THREE.Mesh(holeGeo, holeMat);
    holeBottom.position.set(isRight ? 0.3 : -0.3, -height * 0.3, 0);
    earGroup.add(holeBottom);

    return earGroup;
  };

  const leftEar = createEar(false);
  leftEar.position.set(-width / 2 - earWidth / 2, 0, 0);
  root.add(leftEar);

  const rightEar = createEar(true);
  rightEar.position.set(width / 2 + earWidth / 2, 0, 0);
  root.add(rightEar);

  return root;
}
