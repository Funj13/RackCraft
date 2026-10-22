import * as THREE from 'three';

export interface RJ45PortOptions {
  type: 'lan' | 'wan' | 'console';
  ledStatus?: boolean;
  isDomestic?: boolean; // Se for roteador Wi-Fi doméstico usa moldura amarela/azul, caso contrário usa metal profissional da foto
  latchPosition?: 'bottom' | 'top'; // 'top' = porta superior (trava em cima, LEDs em cima, pinos embaixo); 'bottom' = porta inferior (trava embaixo, LEDs embaixo, pinos em cima)
}

/**
 * Cria porta Ethernet RJ45 (8P8C MagJack) de alta fidelidade
 * - Profundidade aumentada real com cavidade vazada e fundo escuro (furo real de conector)
 * - Suporte a posicionamento intercalado:
 *   - Porta 1 (Superior): Trava para CIMA, LEDs Rx/Tx no TOPO, pinos dourados no CHÃO
 *   - Porta 2 (Inferior): Trava para BAIXO, LEDs Rx/Tx na BASE, pinos dourados no TETO
 * - Moldura de blindagem metálica niquelada com chanfros e abas EMI
 * - 8 pinos de contato em ouro 24k metálico reflexivo
 */
export function createRJ45Port(options: RJ45PortOptions): THREE.Group {
  const root = new THREE.Group();
  root.name = `RJ45_${options.type.toUpperCase()}`;

  const isTopLatch = options.latchPosition === 'top';

  // Cores da blindagem frontal:
  let frameColor = 0x8a99ad; // Metal niquelado acetinado profissional
  let frameMetalness = 0.85;
  let frameRoughness = 0.28;

  if (options.isDomestic && options.type === 'lan') {
    frameColor = 0xfacc15;
    frameMetalness = 0.2;
    frameRoughness = 0.4;
  } else if (options.isDomestic && options.type === 'wan') {
    frameColor = 0x0284c7;
    frameMetalness = 0.2;
    frameRoughness = 0.4;
  } else if (options.type === 'console') {
    // Porta de Console RJ45 (característica Cisco: anel/borda azul claro)
    frameColor = 0x0284c7;
    frameMetalness = 0.7;
    frameRoughness = 0.35;
  }

  const metalShieldMat = new THREE.MeshStandardMaterial({
    color: frameColor,
    roughness: frameRoughness,
    metalness: frameMetalness
  });

  // Revestimento interno plástico escuro
  const plasticBodyMat = new THREE.MeshStandardMaterial({
    color: 0x11151c,
    roughness: 0.9,
    metalness: 0.05
  });

  // Fundo escuro profundo da cavidade (preto grafite com absorção de luz)
  const darkBackMat = new THREE.MeshStandardMaterial({
    color: 0x05070a,
    roughness: 0.95,
    metalness: 0.02
  });

  // Pinos de contato de ouro 24k reluzente e brilhante (com leve emissão quente para nunca sumir na sombra da cavidade)
  const goldPinMat = new THREE.MeshStandardMaterial({
    color: 0xffdf00,
    roughness: 0.08,
    metalness: 0.98,
    emissive: 0xffb700,
    emissiveIntensity: 0.28
  });

  // Dimensões do conector padrão RJ-45 MagJack
  const width = 1.54;
  const height = 1.34;
  const depth = 0.65; // Profundidade real do soquete de encaixe do plugue (6.5mm)
  const backZ = 0.01; // Senta rentinho à face do painel (sem nunca penetrar por trás do chassi)
  const frontFaceZ = backZ + depth; // Projeta-se para a frente da face frontal (0.66 cm)
  const centerZ = (frontFaceZ + backZ) / 2;

  // ==============================================================
  // 1. CARCAÇA EXTERNA METÁLICA (Top, Bottom, Sides, Back)
  // ==============================================================
  const shellGroup = new THREE.Group();
  shellGroup.name = 'Metal_Shield_Shell';

  // Parede Traseira da carcaça metálica (senta na face do painel)
  const backWallGeo = new THREE.BoxGeometry(width, height, 0.04);
  const backWall = new THREE.Mesh(backWallGeo, metalShieldMat);
  backWall.position.set(0, 0, backZ + 0.02);
  shellGroup.add(backWall);

  // Parede Superior
  const topWallGeo = new THREE.BoxGeometry(width, 0.08, depth);
  const topWall = new THREE.Mesh(topWallGeo, metalShieldMat);
  topWall.position.set(0, height / 2 - 0.04, centerZ);
  shellGroup.add(topWall);

  // Parede Inferior
  const btmWallGeo = new THREE.BoxGeometry(width, 0.08, depth);
  const btmWall = new THREE.Mesh(btmWallGeo, metalShieldMat);
  btmWall.position.set(0, -height / 2 + 0.04, centerZ);
  shellGroup.add(btmWall);

  // Parede Esquerda
  const leftWallGeo = new THREE.BoxGeometry(0.08, height - 0.16, depth);
  const leftWall = new THREE.Mesh(leftWallGeo, metalShieldMat);
  leftWall.position.set(-width / 2 + 0.04, 0, centerZ);
  shellGroup.add(leftWall);

  // Parede Direita
  const rightWallGeo = new THREE.BoxGeometry(0.08, height - 0.16, depth);
  const rightWall = new THREE.Mesh(rightWallGeo, metalShieldMat);
  rightWall.position.set(width / 2 - 0.04, 0, centerZ);
  shellGroup.add(rightWall);

  // Linguetas metálicas EMI (no lado oposto à trava)
  if (!options.isDomestic) {
    const emiTabGeo = new THREE.BoxGeometry(0.24, 0.025, 0.20);
    const emiTabY = isTopLatch ? -height / 2 - 0.015 : height / 2 + 0.015;
    const emiTab1 = new THREE.Mesh(emiTabGeo, metalShieldMat);
    emiTab1.position.set(-0.35, emiTabY, centerZ);
    shellGroup.add(emiTab1);

    const emiTab2 = new THREE.Mesh(emiTabGeo, metalShieldMat);
    emiTab2.position.set(0.35, emiTabY, centerZ);
    shellGroup.add(emiTab2);
  }

  root.add(shellGroup);

  // ==============================================================
  // 2. CAVIDADE PROFUNDA REAL COM FUNDO ESCURO
  // ==============================================================
  const cavityGroup = new THREE.Group();
  cavityGroup.name = 'Deep_Cavity_Interior';

  // Paredes plásticas internas (revestimento escuro)
  const linerDepth = depth - 0.08;
  const linerTopGeo = new THREE.BoxGeometry(width - 0.20, 0.04, linerDepth);
  const linerTop = new THREE.Mesh(linerTopGeo, plasticBodyMat);
  linerTop.position.set(0, height / 2 - 0.08, centerZ);
  cavityGroup.add(linerTop);

  const linerBtm = new THREE.Mesh(linerTopGeo, plasticBodyMat);
  linerBtm.position.set(0, -height / 2 + 0.08, centerZ);
  cavityGroup.add(linerBtm);

  const linerSideGeo = new THREE.BoxGeometry(0.04, height - 0.20, linerDepth);
  const linerLeft = new THREE.Mesh(linerSideGeo, plasticBodyMat);
  linerLeft.position.set(-width / 2 + 0.08, 0, centerZ);
  cavityGroup.add(linerLeft);

  const linerRight = new THREE.Mesh(linerSideGeo, plasticBodyMat);
  linerRight.position.set(width / 2 - 0.08, 0, centerZ);
  cavityGroup.add(linerRight);

  // Fundo escuro profundo (Backplate)
  const backPlateGeo = new THREE.BoxGeometry(width - 0.22, height - 0.22, 0.04);
  const backPlate = new THREE.Mesh(backPlateGeo, darkBackMat);
  backPlate.position.set(0, 0, backZ + 0.04);
  cavityGroup.add(backPlate);

  // Sulcos plásticos verticais escuros no fundo
  const ribGeo = new THREE.BoxGeometry(0.035, height - 0.36, 0.03);
  for (let r = -3; r <= 3; r++) {
    const rib = new THREE.Mesh(ribGeo, darkBackMat);
    rib.position.set(r * 0.13, 0, backZ + 0.06);
    cavityGroup.add(rib);
  }

  root.add(cavityGroup);

  // ==============================================================
  // 3. MOLDURA FRONTAL COM RECORTE ESPECÍFICO (INTERCALADO)
  //    - Top latch: Trava no topo, LEDs no topo, pinos no chão
  //    - Bottom latch: Trava na base, LEDs na base, pinos no teto
  // ==============================================================
  const bezelGroup = new THREE.Group();
  bezelGroup.name = 'Front_Bezel_Keyed';

  // Colunas laterais frontais
  const colHeight = height - 0.48;
  const frontSideColGeo = new THREE.BoxGeometry(0.16, colHeight, 0.08);
  const leftCol = new THREE.Mesh(frontSideColGeo, metalShieldMat);
  leftCol.position.set(-width / 2 + 0.08, 0, frontFaceZ - 0.04);
  bezelGroup.add(leftCol);

  const rightCol = new THREE.Mesh(frontSideColGeo, metalShieldMat);
  rightCol.position.set(width / 2 - 0.08, 0, frontFaceZ - 0.04);
  bezelGroup.add(rightCol);

  const btmTabWidth = 0.45;
  const btmTabHeight = 0.26;
  const tabGeo = new THREE.BoxGeometry(btmTabWidth, btmTabHeight, 0.08);
  const solidBarGeo = new THREE.BoxGeometry(width, 0.24, 0.08);

  if (isTopLatch) {
    // --- PORTA 1 (SUPERIOR): TRAVA PARA CIMA ---
    // Barra sólida na parte inferior (chão plano)
    const solidBar = new THREE.Mesh(solidBarGeo, metalShieldMat);
    solidBar.position.set(0, -height / 2 + 0.12, frontFaceZ - 0.04);
    bezelGroup.add(solidBar);

    // Duas abas superiores com vão central de trava aberta no topo
    const leftTab = new THREE.Mesh(tabGeo, metalShieldMat);
    leftTab.position.set(-width / 2 + btmTabWidth / 2 + 0.05, height / 2 - btmTabHeight / 2 - 0.04, frontFaceZ - 0.04);
    bezelGroup.add(leftTab);

    const rightTab = new THREE.Mesh(tabGeo, metalShieldMat);
    rightTab.position.set(width / 2 - btmTabWidth / 2 - 0.05, height / 2 - btmTabHeight / 2 - 0.04, frontFaceZ - 0.04);
    bezelGroup.add(rightTab);

    // Guia plástica interna da trava no topo
    const latchGuideGeo = new THREE.BoxGeometry(0.44, 0.12, 0.25);
    const latchGuide = new THREE.Mesh(latchGuideGeo, plasticBodyMat);
    latchGuide.position.set(0, height / 2 - 0.10, frontFaceZ - 0.16);
    bezelGroup.add(latchGuide);
  } else {
    // --- PORTA 2 (INFERIOR): TRAVA PARA BAIXO ---
    // Barra sólida na parte superior (teto plano)
    const solidBar = new THREE.Mesh(solidBarGeo, metalShieldMat);
    solidBar.position.set(0, height / 2 - 0.12, frontFaceZ - 0.04);
    bezelGroup.add(solidBar);

    // Duas abas inferiores com vão central de trava aberta na base
    const leftTab = new THREE.Mesh(tabGeo, metalShieldMat);
    leftTab.position.set(-width / 2 + btmTabWidth / 2 + 0.05, -height / 2 + btmTabHeight / 2 + 0.04, frontFaceZ - 0.04);
    bezelGroup.add(leftTab);

    const rightTab = new THREE.Mesh(tabGeo, metalShieldMat);
    rightTab.position.set(width / 2 - btmTabWidth / 2 - 0.05, -height / 2 + btmTabHeight / 2 + 0.04, frontFaceZ - 0.04);
    bezelGroup.add(rightTab);

    // Guia plástica interna da trava na base
    const latchGuideGeo = new THREE.BoxGeometry(0.44, 0.12, 0.25);
    const latchGuide = new THREE.Mesh(latchGuideGeo, plasticBodyMat);
    latchGuide.position.set(0, -height / 2 + 0.10, frontFaceZ - 0.16);
    bezelGroup.add(latchGuide);
  }

  root.add(bezelGroup);

  // ==============================================================
  // 4. OS 8 PINOS DOURADOS METÁLICOS (LADO OPOSTO À TRAVA)
  //    - Se a trava é em cima -> pinos ficam no CHÃO (inclinados para cima)
  //    - Se a trava é embaixo -> pinos ficam no TETO (inclinados para baixo)
  // ==============================================================
  const pinWidth = 0.052;
  const pinHeight = 0.045;
  const pinLength = 0.36;
  const pinGeo = new THREE.BoxGeometry(pinWidth, pinHeight, pinLength);

  const pinGroup = new THREE.Group();
  pinGroup.name = 'RJ45_8_Gold_Pins';

  const totalPinsWidth = 0.88;
  const pinStep = totalPinsWidth / 7;

  const pinY = isTopLatch ? -height / 2 + 0.22 : height / 2 - 0.22;
  const pinRotX = isTopLatch ? 0.22 : -0.22; // Inclinados em direção à frente da cavidade

  for (let i = 0; i < 8; i++) {
    const pin = new THREE.Mesh(pinGeo, goldPinMat);
    const pinX = -totalPinsWidth / 2 + i * pinStep;
    pin.position.set(pinX, pinY, centerZ + 0.02);
    pin.rotation.x = pinRotX;
    pinGroup.add(pin);
  }

  // Pente guia de plástico atrás dos pinos
  const pinCombGeo = new THREE.BoxGeometry(totalPinsWidth + 0.12, 0.05, 0.32);
  const pinComb = new THREE.Mesh(pinCombGeo, plasticBodyMat);
  const combY = isTopLatch ? -height / 2 + 0.16 : height / 2 - 0.16;
  pinComb.position.set(0, combY, backZ + 0.16);
  pinGroup.add(pinComb);

  root.add(pinGroup);

  // ==============================================================
  // 5. DOIS MICRO-LEDS NOS CANTOS DO MESMO LADO DA TRAVA
  //    - Porta 1 (Trava no topo): LEDs Rx e Tx no TOPO
  //    - Porta 2 (Trava na base): LEDs Rx e Tx na BASE
  //    (Console port não usa LEDs Rx/Tx de rede)
  // ==============================================================
  if (options.type !== 'console') {
    const isLit = options.ledStatus ?? true;
    const rxColor = 0x22c55e; // Verde brilhante
    const txColor = 0xf59e0b; // Âmbar/Laranja brilhante

    const rxMat = new THREE.MeshStandardMaterial({
      color: rxColor,
      emissive: isLit ? rxColor : 0x052e16,
      emissiveIntensity: isLit ? 1.8 : 0.0,
      roughness: 0.15,
      metalness: 0.05
    });

    const txMat = new THREE.MeshStandardMaterial({
      color: txColor,
      emissive: isLit ? txColor : 0x451a03,
      emissiveIntensity: isLit ? 1.5 : 0.0,
      roughness: 0.15,
      metalness: 0.05
    });

    const ledBezelGeo = new THREE.BoxGeometry(0.28, 0.18, 0.06);
    const ledLensGeo = new THREE.BoxGeometry(0.22, 0.13, 0.08);

    // Posição Y do LED acompanha exatamente o lado da trava
    const ledY = isTopLatch ? height / 2 - 0.12 : -height / 2 + 0.12;
    const ledZ = frontFaceZ + 0.01;

    // LED Rx (Esquerda)
    const ledRxBezel = new THREE.Mesh(ledBezelGeo, plasticBodyMat);
    ledRxBezel.position.set(-width / 2 + 0.25, ledY, frontFaceZ - 0.02);
    root.add(ledRxBezel);

    const ledRx = new THREE.Mesh(ledLensGeo, rxMat);
    ledRx.name = 'LED_Rx_Green';
    ledRx.position.set(-width / 2 + 0.25, ledY, ledZ);
    root.add(ledRx);

    // LED Tx (Direita)
    const ledTxBezel = new THREE.Mesh(ledBezelGeo, plasticBodyMat);
    ledTxBezel.position.set(width / 2 - 0.25, ledY, frontFaceZ - 0.02);
    root.add(ledTxBezel);

    const ledTx = new THREE.Mesh(ledLensGeo, txMat);
    ledTx.name = 'LED_Tx_Amber';
    ledTx.position.set(width / 2 - 0.25, ledY, ledZ);
    root.add(ledTx);
  }

  return root;
}

export const RJ45_SPACING_X = 1.62;
export const RJ45_SPACING_Y = 1.48;

export function getRJ45BlockWidth(lanCount: number, wanCount: number, doubleRow: boolean): number {
  const total = lanCount + wanCount;
  if (total === 0) return 0;
  const cols = doubleRow ? Math.ceil(total / 2) : total;
  return cols * RJ45_SPACING_X;
}

/**
 * Cria o bloco de portas RJ45 com carcaça protetora superior
 * e pivô centralizado no ponto X=0.
 */
export function createRJ45PortBlock(
  lanCount: number,
  wanCount: number,
  doubleRow: boolean = false,
  ledStatus: boolean = true,
  isDomestic: boolean = false
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'RJ45_Block';

  const totalPorts = lanCount + wanCount;
  if (totalPorts === 0) return group;

  const cols = doubleRow ? Math.ceil(totalPorts / 2) : totalPorts;
  const totalWidth = cols * RJ45_SPACING_X;
  const startX = -totalWidth / 2 + RJ45_SPACING_X / 2;

  let portIndex = 0;

  // 1. Portas WAN
  for (let i = 0; i < wanCount; i++) {
    const isTop = doubleRow ? (portIndex % 2 === 0) : false;
    const port = createRJ45Port({
      type: 'wan',
      ledStatus,
      isDomestic,
      latchPosition: isTop ? 'top' : 'bottom'
    });
    placePort(port, portIndex, doubleRow, startX);
    group.add(port);
    portIndex++;
  }

  // 2. Portas LAN
  for (let i = 0; i < lanCount; i++) {
    const isTop = doubleRow ? (portIndex % 2 === 0) : false;
    const port = createRJ45Port({
      type: 'lan',
      ledStatus,
      isDomestic,
      latchPosition: isTop ? 'top' : 'bottom'
    });
    placePort(port, portIndex, doubleRow, startX);
    group.add(port);
    portIndex++;
  }

  return group;
}

function placePort(port: THREE.Group, index: number, doubleRow: boolean, startX: number) {
  if (doubleRow) {
    const col = Math.floor(index / 2);
    const row = index % 2;
    port.position.x = startX + col * RJ45_SPACING_X;
    port.position.y = row === 0 ? RJ45_SPACING_Y / 2 : -RJ45_SPACING_Y / 2;
  } else {
    port.position.x = startX + index * RJ45_SPACING_X;
    port.position.y = 0;
  }
}
