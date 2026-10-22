import * as THREE from 'three';
import { RouterConfig } from '../types/router';
import { TextureManager } from '../painter/TextureManager';
import { applyRouterBoxUVs } from './UVAtlas';
import { createRJ45Port } from './PortsRJ45';
import { createUSBPort } from './FrontPanelDetails';
import { createPowerConnectorGroup } from './PowerConnectors';
import { applyElementTransform } from './TransformHelper';

/**
 * Constrói o roteador Intelbras R3005G de forma 100% fiel à imagem de referência (Imagem 2):
 * - Carcaça compacta de metal grafite escuro (16.0 x 3.0 x 10.8 cm)
 * - Moldura frontal com rebaixo metálico (recessed bezel)
 * - Painel Frontal completo com:
 *   - Logo silkscreen "intelbras" + "R3005G"
 *   - Conector de Alimentação DC 12V frontal com grafismo de trilha de circuito impresso
 *   - LEDs de status (L1..W5, SYS, PWR)
 *   - Porta USB vertical
 *   - Furo de RESET
 *   - 5 Portas RJ45 Gigabit com faixas verdes indicadoras acima de cada porta (LAN1..WAN1)
 *   - Fendas de ventilação estampadas (louvers) nas laterais
 *   - 4 Pés de borracha na base
 */
export function buildIntelbrasR3005G(config: RouterConfig, textureManager: TextureManager): THREE.Group {
  const root = new THREE.Group();
  root.name = config.name || 'Intelbras_R3005G';

  const width = config.chassis.width || 16.0;
  const height = config.chassis.height || 3.0;
  const depth = config.chassis.depth || 10.8;

  // 1. Chassi Principal
  const chassisGeo = new THREE.BoxGeometry(width, height, depth);
  applyRouterBoxUVs(chassisGeo, textureManager.faceRegions, textureManager.size);

  const bodyMat = new THREE.MeshStandardMaterial({
    map: textureManager.threeTexture,
    color: 0x22272e,
    roughness: 0.65,
    metalness: 0.35
  });

  const chassisMesh = new THREE.Mesh(chassisGeo, bodyMat);
  chassisMesh.name = 'Chassis_Body';
  chassisMesh.castShadow = true;
  chassisMesh.receiveShadow = true;
  chassisMesh.userData = { isPaintable: true };
  root.add(chassisMesh);

  // 2. Moldura Frontal Rebaixada (Recessed Bezel)
  const bezelBorderThickness = 0.22;
  const bezelDepth = 0.28;
  const bezelWidth = width - bezelBorderThickness * 2;
  const bezelHeight = height - bezelBorderThickness * 2;
  const frontZ = depth / 2;

  const bezelMat = new THREE.MeshStandardMaterial({
    color: 0x161a22,
    roughness: 0.75,
    metalness: 0.3
  });

  // Fundo rebaixado da frente
  const recessedFaceGeo = new THREE.PlaneGeometry(bezelWidth, bezelHeight);
  const recessedFace = new THREE.Mesh(recessedFaceGeo, bezelMat);
  recessedFace.position.set(0, 0, frontZ - bezelDepth + 0.01);
  root.add(recessedFace);

  // Bordas do rebaixo (paredes internas)
  const innerWallMat = new THREE.MeshStandardMaterial({
    color: 0x0f1319,
    roughness: 0.8,
    metalness: 0.2
  });
  // Topo do rebaixo
  const topWall = new THREE.Mesh(new THREE.BoxGeometry(bezelWidth, 0.04, bezelDepth), innerWallMat);
  topWall.position.set(0, bezelHeight / 2, frontZ - bezelDepth / 2);
  root.add(topWall);
  // Base do rebaixo
  const botWall = new THREE.Mesh(new THREE.BoxGeometry(bezelWidth, 0.04, bezelDepth), innerWallMat);
  botWall.position.set(0, -bezelHeight / 2, frontZ - bezelDepth / 2);
  root.add(botWall);
  // Parede esquerda do rebaixo
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.04, bezelHeight, bezelDepth), innerWallMat);
  leftWall.position.set(-bezelWidth / 2, 0, frontZ - bezelDepth / 2);
  root.add(leftWall);
  // Parede direita do rebaixo
  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.04, bezelHeight, bezelDepth), innerWallMat);
  rightWall.position.set(bezelWidth / 2, 0, frontZ - bezelDepth / 2);
  root.add(rightWall);

  // 3. Fendas de Ventilação Estampadas (Louvers) nas Laterais Esquerda e Direita
  const louverMat = new THREE.MeshStandardMaterial({ color: 0x11161d, roughness: 0.9, metalness: 0.1 });
  const louverGeo = new THREE.BoxGeometry(0.06, 0.12, 1.2);
  const louverCount = 14;
  const louverSpacing = 0.22;
  const louverStartX = -width / 2;
  const louverEndX = width / 2;

  for (let i = 0; i < louverCount; i++) {
    const lz = (i - (louverCount - 1) / 2) * louverSpacing;
    const louverL = new THREE.Mesh(louverGeo, louverMat);
    louverL.position.set(louverStartX - 0.01, 0, lz);
    root.add(louverL);

    const louverR = new THREE.Mesh(louverGeo, louverMat);
    louverR.position.set(louverEndX + 0.01, 0, lz);
    root.add(louverR);
  }

  // 4. Quatro Pés de borracha na base
  const footGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.14, 16);
  const footMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.95 });
  const footDistX = width * 0.42;
  const footDistZ = depth * 0.38;
  const footY = -height / 2 - 0.07;
  [[-footDistX, -footDistZ], [footDistX, -footDistZ], [-footDistX, footDistZ], [footDistX, footDistZ]].forEach(([fx, fz]) => {
    const foot = new THREE.Mesh(footGeo, footMat);
    foot.position.set(fx, footY, fz);
    root.add(foot);
  });

  // 5. PAINEL FRONTAL DETALHADO (da esquerda para a direita)
  const panelSurfaceZ = frontZ - bezelDepth + 0.02;

  // A. Logo Silkscreen Intelbras + R3005G (Canto superior esquerdo)
  const logoCanvas = document.createElement('canvas');
  logoCanvas.width = 512;
  logoCanvas.height = 128;
  const lctx = logoCanvas.getContext('2d')!;
  lctx.clearRect(0, 0, 512, 128);
  lctx.fillStyle = '#10b981'; // Ponto verde Intelbras
  lctx.beginPath();
  lctx.arc(36, 52, 12, 0, Math.PI * 2);
  lctx.fill();
  lctx.fillStyle = '#f8fafc';
  lctx.font = 'bold 50px sans-serif';
  lctx.fillText('intelbras', 58, 68);
  lctx.font = 'normal 26px sans-serif';
  lctx.fillStyle = '#94a3b8';
  lctx.fillText('R3005G', 58, 102);

  const logoTex = new THREE.CanvasTexture(logoCanvas);
  logoTex.anisotropy = 4;
  const logoMat = new THREE.MeshStandardMaterial({
    map: logoTex,
    transparent: true,
    alphaTest: 0.05,
    roughness: 0.4,
    metalness: 0.1
  });
  const logoMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 0.75), logoMat);
  logoMesh.position.set(-width / 2 + 2.0, height / 2 - 0.72, panelSurfaceZ + 0.01);
  root.add(logoMesh);

  // B. Furo de Reset (Pinhole)
  const resetGroup = new THREE.Group();
  resetGroup.name = 'Element_Reset_Pinhole';
  resetGroup.userData = {
    isSelectable: true,
    elementId: 'wps_reset',
    elementName: 'Furo Reset',
    baseX: -width / 2 + 1.2,
    baseY: -height / 2 + 0.8,
    baseZ: panelSurfaceZ,
    face: 'front'
  };
  const holeMat = new THREE.MeshStandardMaterial({ color: 0x05070a, roughness: 0.95 });
  const holeGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.1, 16);
  holeGeo.rotateX(Math.PI / 2);
  const resetHole = new THREE.Mesh(holeGeo, holeMat);
  resetGroup.add(resetHole);

  const rstCanvas = document.createElement('canvas');
  rstCanvas.width = 128;
  rstCanvas.height = 48;
  const rctx = rstCanvas.getContext('2d')!;
  rctx.fillStyle = '#94a3b8';
  rctx.font = 'bold 26px sans-serif';
  rctx.textAlign = 'center';
  rctx.fillText('Reset', 64, 34);
  const rstTex = new THREE.CanvasTexture(rstCanvas);
  const rstMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 0.25),
    new THREE.MeshStandardMaterial({ map: rstTex, transparent: true, alphaTest: 0.1 })
  );
  rstMesh.position.set(0, -0.25, 0.01);
  resetGroup.add(rstMesh);
  applyElementTransform(resetGroup, config, 'wps_reset', -width / 2 + 1.2, -height / 2 + 0.8, panelSurfaceZ, 0, 0, 0, 'front');
  root.add(resetGroup);

  // C. Porta de Alimentação 12V DC Frontal
  const powerGroup = new THREE.Group();
  powerGroup.name = 'Element_Front_DC_Power';
  powerGroup.userData = {
    isSelectable: true,
    elementId: 'power',
    elementName: 'Entrada DC 12V (Frontal)',
    baseX: -width / 2 + 2.7,
    baseY: -height / 2 + 0.82,
    baseZ: panelSurfaceZ,
    face: 'front'
  };

  const dcJack = createPowerConnectorGroup({ type: 'dc_barrel' });
  powerGroup.add(dcJack);

  const dcCanvas = document.createElement('canvas');
  dcCanvas.width = 256;
  dcCanvas.height = 96;
  const dctx = dcCanvas.getContext('2d')!;
  dctx.fillStyle = '#94a3b8';
  dctx.font = 'bold 28px sans-serif';
  dctx.textAlign = 'center';
  dctx.fillText('12V == 1A', 128, 38);
  dctx.font = '22px sans-serif';
  dctx.fillText('- (o - +', 128, 74);
  const dcTex = new THREE.CanvasTexture(dcCanvas);
  const dcLabelMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 0.45),
    new THREE.MeshStandardMaterial({ map: dcTex, transparent: true, alphaTest: 0.1 })
  );
  dcLabelMesh.position.set(0, -0.65, 0.01);
  powerGroup.add(dcLabelMesh);

  applyElementTransform(powerGroup, config, 'power', -width / 2 + 2.7, -height / 2 + 0.82, panelSurfaceZ, 0, 0, 0, 'front');
  root.add(powerGroup);

  // D. LEDs Indicadores de Status (L1..W5, SYS, PWR)
  const ledsGroup = new THREE.Group();
  ledsGroup.name = 'Element_Status_LEDs';
  ledsGroup.userData = {
    isSelectable: true,
    elementId: 'leds',
    elementName: 'LEDs Status (L1..W5, SYS, PWR)',
    baseX: -width / 2 + 4.6,
    baseY: height / 2 - 0.75,
    baseZ: panelSurfaceZ,
    face: 'front'
  };

  const ledLabels = ['PWR', 'SYS', 'L1', 'L2', 'L3', 'L4', 'W5'];
  const ledSpacing = 0.45;
  const ledGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.06, 12);
  ledGeo.rotateX(Math.PI / 2);
  const ledOnMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x22c55e,
    emissiveIntensity: 0.8,
    roughness: 0.2
  });

  ledLabels.forEach((lbl, idx) => {
    const lx = (idx - (ledLabels.length - 1) / 2) * ledSpacing;
    const ledMesh = new THREE.Mesh(ledGeo, ledOnMat);
    ledMesh.position.set(lx, 0.12, 0.02);
    ledsGroup.add(ledMesh);

    const lCanvas = document.createElement('canvas');
    lCanvas.width = 64;
    lCanvas.height = 36;
    const ctx = lCanvas.getContext('2d')!;
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(lbl, 32, 26);
    const tex = new THREE.CanvasTexture(lCanvas);
    const lblMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.35, 0.2),
      new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.1 })
    );
    lblMesh.position.set(lx, -0.15, 0.01);
    ledsGroup.add(lblMesh);
  });

  applyElementTransform(ledsGroup, config, 'leds', -width / 2 + 4.6, height / 2 - 0.75, panelSurfaceZ, 0, 0, 0, 'front');
  root.add(ledsGroup);

  // E. Porta USB Vertical
  if (config.ports.usbPortCount > 0) {
    const usbGroup = new THREE.Group();
    usbGroup.name = 'Element_Front_USB';
    usbGroup.userData = {
      isSelectable: true,
      elementId: 'usb',
      elementName: 'Porta USB 3.0 Frontal',
      baseX: -width / 2 + 6.8,
      baseY: 0,
      baseZ: panelSurfaceZ,
      face: 'front'
    };
    const usb = createUSBPort();
    usb.rotation.z = Math.PI / 2;
    usbGroup.add(usb);

    applyElementTransform(usbGroup, config, 'usb', -width / 2 + 6.8, 0, panelSurfaceZ, 0, 0, 0, 'front');
    root.add(usbGroup);
  }

  // F. 5 Portas RJ45 Gigabit com Faixas Verdes Indicadoras (LAN1..WAN1)
  const rj45Group = new THREE.Group();
  rj45Group.name = 'Element_RJ45_Ports';
  rj45Group.userData = {
    isSelectable: true,
    elementId: 'rj45',
    elementName: '5 Portas RJ45 (LAN1..WAN1)',
    baseX: width / 2 - 4.4,
    baseY: -0.1,
    baseZ: panelSurfaceZ,
    face: 'front'
  };

  const portCount = 5;
  const portPitch = 1.62;
  const portLabels = ['LAN 1', 'LAN 2 / WAN 4', 'LAN 3 / WAN 3', 'LAN 4 / WAN 2', 'WAN 1'];

  for (let i = 0; i < portCount; i++) {
    const px = (i - (portCount - 1) / 2) * portPitch;
    const isTopLatch = i % 2 === 0;

    const port = createRJ45Port({
      type: i === 4 ? 'wan' : 'lan',
      latchPosition: isTopLatch ? 'top' : 'bottom',
      ledStatus: true
    });
    port.position.set(px, 0, 0);
    rj45Group.add(port);

    const stripeGeo = new THREE.PlaneGeometry(1.3, 0.08);
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 0.4
    });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.set(px, 0.82, 0.01);
    rj45Group.add(stripe);

    const pCanvas = document.createElement('canvas');
    pCanvas.width = 160;
    pCanvas.height = 48;
    const pctx = pCanvas.getContext('2d')!;
    pctx.fillStyle = '#f8fafc';
    pctx.font = 'bold 20px sans-serif';
    pctx.textAlign = 'center';
    pctx.fillText(portLabels[i] || `P${i + 1}`, 80, 32);
    const pTex = new THREE.CanvasTexture(pCanvas);
    const pLabelMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.35),
      new THREE.MeshStandardMaterial({ map: pTex, transparent: true, alphaTest: 0.1 })
    );
    pLabelMesh.position.set(px, 1.05, 0.01);
    rj45Group.add(pLabelMesh);
  }

  applyElementTransform(rj45Group, config, 'rj45', width / 2 - 4.4, -0.1, panelSurfaceZ, 0, 0, 0, 'front');
  root.add(rj45Group);

  return root;
}
