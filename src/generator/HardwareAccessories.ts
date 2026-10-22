import * as THREE from 'three';

/**
 * Cria uma textura procedural realista para a ferragem perfurada com furinhos de respiro (Imagem 1)
 */
function createPerforatedGrillTexture(cols: number = 32, rows: number = 10): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;

  // Fundo metálico prateado/cinza claro anodizado
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Gradiente sutil metálico escovado
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
  grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.05)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Desenha os furinhos de respiro circulares escuros com bevel realista
  const marginX = 14;
  const marginY = 12;
  const usableW = canvas.width - marginX * 2;
  const usableH = canvas.height - marginY * 2;

  const dx = usableW / cols;
  const dy = usableH / rows;
  const radius = Math.min(dx, dy) * 0.38;

  for (let r = 0; r < rows; r++) {
    // Alternância estilo favo de mel (honeycomb offset)
    const rowOffset = (r % 2 === 1) ? dx * 0.5 : 0;

    for (let c = 0; c < cols; c++) {
      const cx = marginX + c * dx + rowOffset;
      const cy = marginY + r * dy;

      if (cx > canvas.width - marginX) continue;

      // Sombra externa sutil do furo
      ctx.beginPath();
      ctx.arc(cx, cy + 0.8, radius + 0.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fill();

      // Interior preto profundo do furo
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#030712';
      ctx.fill();

      // Gradiente interno simulando profundidade da chapa
      const holeGrad = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.3, 1, cx, cy, radius);
      holeGrad.addColorStop(0, '#111827');
      holeGrad.addColorStop(1, '#000000');
      ctx.fillStyle = holeGrad;
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * Cria textura para a grelha de exaustão do cooler da fonte (Imagem 2)
 */
function createFanGrillTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 256, 256);

  const cx = 128;
  const cy = 128;

  // Abertura circular
  ctx.beginPath();
  ctx.arc(cx, cy, 110, 0, Math.PI * 2);
  ctx.fillStyle = '#020617';
  ctx.fill();

  // Furinhos da grelha de ventilação concêntricos
  for (let ring = 25; ring <= 100; ring += 14) {
    const count = Math.floor((2 * Math.PI * ring) / 14);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const hx = cx + Math.cos(angle) * ring;
      const hy = cy + Math.sin(angle) * ring;

      ctx.beginPath();
      ctx.arc(hx, hy, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#1e293b';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(hx, hy, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = '#000000';
      ctx.fill();
    }
  }

  // Rótulo central da ventoinha
  ctx.beginPath();
  ctx.arc(cx, cy, 38, 0, Math.PI * 2);
  ctx.fillStyle = '#1e293b';
  ctx.fill();
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('100-240V~', cx, cy - 8);
  ctx.font = '10px sans-serif';
  ctx.fillText('4-2A 50/60Hz', cx, cy + 8);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/**
 * 1. MÓDULO COMPLETO DE FONTE HOT-SWAP (PSU) DE SWITCH / SERVIDOR (IMAGEM 2)
 * Inclui:
 * - Carcaça metálica modular escura
 * - Cooler / ventoinha de exaustão com 4 parafusos de fixação
 * - Alça metálica de extração (extraction handle)
 * - Trava hot-swap com alavanca / aba de liberação rápida
 * - Conector IEC C14 de 3 pinos embutido
 * - LEDs de diagnóstico (AC OK / Fault)
 */
export function createHotSwapPSUModule(index: number = 1): THREE.Group {
  const root = new THREE.Group();
  root.name = `HotSwap_PSU_${index}`;
  root.userData = {
    isSelectable: true,
    elementId: index === 1 ? 'psu_module' : 'psu_module_2',
    elementName: index === 1 ? 'Fonte Hot-Swap 1 (Completa)' : 'Fonte Hot-Swap 2 (Redundante)',
    baseX: 0,
    baseY: 0
  };

  const width = 8.6;
  const height = 3.8;
  const depth = 1.4;

  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.45,
    metalness: 0.8
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.2,
    metalness: 0.95
  });

  const blackPlasticMat = new THREE.MeshStandardMaterial({
    color: 0x09090b,
    roughness: 0.85,
    metalness: 0.1
  });

  const orangeLatchMat = new THREE.MeshStandardMaterial({
    color: 0xf97316, // Laranja industrial de liberação hot-swap (ou cinza)
    roughness: 0.4,
    metalness: 0.2
  });

  // A. Placa frontal / faceplate da fonte
  const plateGeo = new THREE.BoxGeometry(width, height, depth);
  const plateMesh = new THREE.Mesh(plateGeo, darkMetalMat);
  plateMesh.position.z = depth / 2;
  root.add(plateMesh);

  // Friso escuro de contorno
  const borderGeo = new THREE.BoxGeometry(width + 0.1, height + 0.1, 0.1);
  const borderMesh = new THREE.Mesh(borderGeo, new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.9 }));
  borderMesh.position.z = 0.05;
  root.add(borderMesh);

  // -------------------------------------------------------------
  // LADO ESQUERDO: Ventoinha / Cooler de exaustão com grelha
  // -------------------------------------------------------------
  const fanSize = 3.2;
  const fanCenterX = -width * 0.26;
  const fanCenterY = 0;

  const fanTexture = createFanGrillTexture();
  const fanMat = new THREE.MeshStandardMaterial({
    map: fanTexture,
    roughness: 0.5,
    metalness: 0.5
  });

  const fanMeshGeo = new THREE.PlaneGeometry(fanSize, fanSize);
  const fanMesh = new THREE.Mesh(fanMeshGeo, fanMat);
  fanMesh.position.set(fanCenterX, fanCenterY, depth + 0.02);
  root.add(fanMesh);

  // 4 Parafusos prateados nos cantos do cooler (exatamente como na foto)
  const screwGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.1, 12);
  screwGeo.rotateX(Math.PI / 2);

  const halfFan = fanSize * 0.42;
  [
    [-halfFan, -halfFan],
    [halfFan, -halfFan],
    [-halfFan, halfFan],
    [halfFan, halfFan]
  ].forEach(([sx, sy]) => {
    const screw = new THREE.Mesh(screwGeo, chromeMat);
    screw.position.set(fanCenterX + sx, fanCenterY + sy, depth + 0.06);
    root.add(screw);

    // Arruela escavada ao redor do parafuso
    const washerGeo = new THREE.RingGeometry(0.18, 0.28, 12);
    const washer = new THREE.Mesh(washerGeo, new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.3, metalness: 0.8 }));
    washer.position.set(fanCenterX + sx, fanCenterY + sy, depth + 0.03);
    root.add(washer);
  });

  // Alça metálica de extração (puxador horizontal para puxar a fonte)
  const handleGroup = new THREE.Group();
  const handleRadius = 0.12;
  const handleLength = 3.4;

  // Barra frontal
  const barGeo = new THREE.CylinderGeometry(handleRadius, handleRadius, handleLength, 12);
  barGeo.rotateZ(Math.PI / 2);
  const barMesh = new THREE.Mesh(barGeo, chromeMat);
  barMesh.position.set(0, -0.6, 0.8);
  handleGroup.add(barMesh);

  // Hastes laterais conectando ao chassi
  const legGeo = new THREE.CylinderGeometry(handleRadius, handleRadius, 0.8, 12);
  legGeo.rotateX(Math.PI / 2);

  const leftLeg = new THREE.Mesh(legGeo, chromeMat);
  leftLeg.position.set(-handleLength / 2, -0.6, 0.4);
  handleGroup.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, chromeMat);
  rightLeg.position.set(handleLength / 2, -0.6, 0.4);
  handleGroup.add(rightLeg);

  handleGroup.position.set(fanCenterX, 0, depth);
  root.add(handleGroup);

  // -------------------------------------------------------------
  // LADO DIREITO: Conector IEC C14 embutido
  // -------------------------------------------------------------
  const connX = width * 0.24;

  // Moldura plástica embutida
  const socketGeo = new THREE.BoxGeometry(2.4, 2.0, 0.3);
  const socketMesh = new THREE.Mesh(socketGeo, blackPlasticMat);
  socketMesh.position.set(connX, 0, depth + 0.05);
  root.add(socketMesh);

  // Cavidade do conector
  const cavityGeo = new THREE.BoxGeometry(1.9, 1.5, 0.5);
  const cavityMat = new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.95 });
  const cavityMesh = new THREE.Mesh(cavityGeo, cavityMat);
  cavityMesh.position.set(connX, 0, depth + 0.15);
  root.add(cavityMesh);

  // 3 Pinos metálicos
  const pinGeo = new THREE.BoxGeometry(0.12, 0.35, 0.5);
  const pinEarth = new THREE.Mesh(pinGeo, chromeMat);
  pinEarth.position.set(connX, 0.25, depth + 0.25);
  root.add(pinEarth);

  const pinLive = new THREE.Mesh(pinGeo, chromeMat);
  pinLive.position.set(connX - 0.55, -0.25, depth + 0.25);
  root.add(pinLive);

  const pinNeutral = new THREE.Mesh(pinGeo, chromeMat);
  pinNeutral.position.set(connX + 0.55, -0.25, depth + 0.25);
  root.add(pinNeutral);

  // Grampo de retenção de cabo de força (Wire Bail)
  const wireBailGeo = new THREE.TorusGeometry(0.8, 0.05, 8, 16, Math.PI);
  const wireBail = new THREE.Mesh(wireBailGeo, chromeMat);
  wireBail.rotation.z = Math.PI / 2;
  wireBail.position.set(connX + 1.25, 0, depth + 0.15);
  root.add(wireBail);

  // -------------------------------------------------------------
  // LATERAL DIREITA: Aba de liberação rápida Hot-Swap (Latch)
  // -------------------------------------------------------------
  const latchGeo = new THREE.BoxGeometry(0.4, 1.2, 0.6);
  const latch = new THREE.Mesh(latchGeo, orangeLatchMat);
  latch.position.set(width / 2 - 0.25, 0, depth + 0.2);
  root.add(latch);

  // LED de diagnóstico AC/DC OK (Verde) e Alert (Âmbar)
  const ledGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.1, 12);
  ledGeo.rotateX(Math.PI / 2);

  const ledGreen = new THREE.Mesh(
    ledGeo,
    new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 1.0 })
  );
  ledGreen.position.set(connX - 1.4, 0.6, depth + 0.06);
  root.add(ledGreen);

  const ledAmber = new THREE.Mesh(
    ledGeo,
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.3 })
  );
  ledAmber.position.set(connX - 1.4, 0.2, depth + 0.06);
  root.add(ledAmber);

  return root;
}

/**
 * 2. FERRAGEM COM FUROS PARA RESPIRO (IMAGEM 1)
 * Placa perfurada metálica com textura de favo/circunferências de ventilação,
 * moldura reforçada e parafusos de fixação.
 */
export function createPerforatedGrillPlate(width: number = 8.0, height: number = 3.6): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Perforated_Vent_Grill';
  root.userData = {
    isSelectable: true,
    elementId: 'perforated_grill',
    elementName: 'Ferragem com Furos para Respiro',
    baseX: 0,
    baseY: 0
  };

  const depth = 0.25;

  // Moldura metálica externa
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.4,
    metalness: 0.8
  });

  const frameGeo = new THREE.BoxGeometry(width, height, depth);
  const frame = new THREE.Mesh(frameGeo, frameMat);
  frame.position.z = depth / 2;
  root.add(frame);

  // Placa perfurada frontal (100% fiel à Imagem 1)
  const grillTex = createPerforatedGrillTexture(Math.round(width * 4), Math.round(height * 3));
  const grillMat = new THREE.MeshStandardMaterial({
    map: grillTex,
    roughness: 0.35,
    metalness: 0.75
  });

  const grillPlaneGeo = new THREE.PlaneGeometry(width * 0.94, height * 0.88);
  const grillPlane = new THREE.Mesh(grillPlaneGeo, grillMat);
  grillPlane.position.z = depth + 0.01;
  root.add(grillPlane);

  // 4 Parafusos prateados nos cantos da placa
  const screwGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12);
  screwGeo.rotateX(Math.PI / 2);
  const screwMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.3, metalness: 0.9 });

  const px = width * 0.45;
  const py = height * 0.42;
  [
    [-px, -py],
    [px, -py],
    [-px, py],
    [px, py]
  ].forEach(([sx, sy]) => {
    const screw = new THREE.Mesh(screwGeo, screwMat);
    screw.position.set(sx, sy, depth + 0.03);
    root.add(screw);
  });

  return root;
}

/**
 * 3. GAVETA DE COOLERS MODULAR (FAN TRAY)
 * Módulo removível com ventoinhas em linha para exaustão forçada de calor em racks.
 */
export function createFanTrayModule(fanCount: number = 2, height: number = 3.8): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Modular_Fan_Tray';
  root.userData = {
    isSelectable: true,
    elementId: 'fan_tray',
    elementName: 'Gaveta de Coolers (Fan Tray)',
    baseX: 0,
    baseY: 0
  };

  const fanWidth = 3.6;
  const totalWidth = fanCount * fanWidth + 0.8;
  const depth = 0.5;

  const trayGeo = new THREE.BoxGeometry(totalWidth, height, depth);
  const trayMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.7 });
  const tray = new THREE.Mesh(trayGeo, trayMat);
  tray.position.z = depth / 2;
  root.add(tray);

  for (let i = 0; i < fanCount; i++) {
    const fx = (i - (fanCount - 1) / 2) * fanWidth;
    const fanTexture = createFanGrillTexture();
    const fanMat = new THREE.MeshStandardMaterial({ map: fanTexture, roughness: 0.4, metalness: 0.6 });
    const fanGeo = new THREE.PlaneGeometry(3.2, 3.2);
    const fan = new THREE.Mesh(fanGeo, fanMat);
    fan.position.set(fx, 0, depth + 0.02);
    root.add(fan);
  }

  return root;
}

/**
 * 4. PONTO DE ATERRAMENTO DUPLO (GROUNDING LUG)
 * Dois parafusos de latão/cobre com arruelas para fixação do cabo de terra em racks.
 */
export function createGroundingLugModule(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Grounding_Lug';
  root.userData = {
    isSelectable: true,
    elementId: 'grounding_lug',
    elementName: 'Ponto de Aterramento (Ground Lug)',
    baseX: 0,
    baseY: 0
  };

  const plateGeo = new THREE.BoxGeometry(1.6, 0.9, 0.2);
  const plateMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.4, metalness: 0.8 });
  const plate = new THREE.Mesh(plateGeo, plateMat);
  plate.position.z = 0.1;
  root.add(plate);

  const boltGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.35, 12);
  boltGeo.rotateX(Math.PI / 2);
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.85 }); // Latão/cobre

  [-0.45, 0.45].forEach((bx) => {
    const bolt = new THREE.Mesh(boltGeo, brassMat);
    bolt.position.set(bx, 0, 0.25);
    root.add(bolt);
  });

  return root;
}

/**
 * 5. ALÇAS FRONTAIS DE MANUSEIO DE RACK (RACK HANDLES)
 * Alças metálicas tubulares robustas em arco para puxar equipamentos pesados de racks.
 */
export function createRackHandles(chassisWidth: number, chassisHeight: number): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Rack_Handles';
  root.userData = {
    isSelectable: true,
    elementId: 'rack_handles',
    elementName: 'Alças de Manuseio de Rack',
    baseX: 0,
    baseY: 0
  };

  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.95 });
  const handleH = chassisHeight * 0.7;
  const radius = 0.18;

  const createSingleHandle = (isRight: boolean) => {
    const grp = new THREE.Group();

    // Barra vertical
    const barGeo = new THREE.CylinderGeometry(radius, radius, handleH, 12);
    const bar = new THREE.Mesh(barGeo, chromeMat);
    bar.position.set(0, 0, 1.6);
    grp.add(bar);

    // Conexões superior e inferior
    const legGeo = new THREE.CylinderGeometry(radius, radius, 1.6, 12);
    legGeo.rotateX(Math.PI / 2);

    const topLeg = new THREE.Mesh(legGeo, chromeMat);
    topLeg.position.set(0, handleH / 2, 0.8);
    grp.add(topLeg);

    const bottomLeg = new THREE.Mesh(legGeo, chromeMat);
    bottomLeg.position.set(0, -handleH / 2, 0.8);
    grp.add(bottomLeg);

    const hx = isRight ? chassisWidth / 2 - 0.8 : -chassisWidth / 2 + 0.8;
    grp.position.set(hx, 0, 0);
    return grp;
  };

  root.add(createSingleHandle(false));
  root.add(createSingleHandle(true));

  return root;
}
