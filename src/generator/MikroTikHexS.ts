import * as THREE from 'three';
import { RouterConfig } from '../types/router';
import { TextureManager } from '../painter/TextureManager';
import { applyRouterBoxUVs } from './UVAtlas';
import { createRJ45Port } from './PortsRJ45';
import { createOpticalPort } from './PortsOptical';
import { createUSBPort } from './FrontPanelDetails';
import { createPowerSwitchModule } from './PowerConnectors';
import { applyElementTransform } from './TransformHelper';

/**
 * Constrói o modelo do MikroTik hEX S de forma 100% paramétrica e customizável:
 * o usuário pode ligar, desligar ou alterar a quantidade de portas, DC, USB, LEDs e botões.
 */
export function buildMikroTikHexS(config: RouterConfig, textureManager: TextureManager): THREE.Group {
  const root = new THREE.Group();
  root.name = config.name || 'MikroTik_hEX_S_2025';

  const width = config.chassis.width || 14.0;
  const height = config.chassis.height || 3.2;
  const depth = config.chassis.depth || 11.0;

  // 1. Chassi Principal
  const chassisGeo = new THREE.BoxGeometry(width, height, depth);
  applyRouterBoxUVs(chassisGeo, textureManager.faceRegions, textureManager.size);

  const chassisMat = new THREE.MeshStandardMaterial({
    map: textureManager.threeTexture,
    roughness: 0.65,
    metalness: 0.15
  });

  const chassisMesh = new THREE.Mesh(chassisGeo, chassisMat);
  chassisMesh.name = 'hEX_S_Body';
  chassisMesh.castShadow = true;
  chassisMesh.receiveShadow = true;
  chassisMesh.userData = { isPaintable: true };
  root.add(chassisMesh);

  // 2. 4 Pés de borracha na base
  const footGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.15, 12);
  const footMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.9 });
  const fx = width * 0.4;
  const fz = depth * 0.4;
  const fy = -height / 2 - 0.07;
  [[-fx, -fz], [fx, -fz], [-fx, fz], [fx, fz]].forEach(([x, z]) => {
    const foot = new THREE.Mesh(footGeo, footMat);
    foot.position.set(x, fy, z);
    root.add(foot);
  });

  // 3. Fendas de resfriamento nas bordas do teto (opcional via ventilationSides / Top)
  if (config.chassis.ventilationSides || config.chassis.ventilationTop) {
    const ventSlotGeo = new THREE.BoxGeometry(0.5, 0.08, 0.2);
    const ventMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
    const halfW = width / 2;
    const halfD = depth / 2;
    const topY = height / 2 + 0.02;

    for (let i = -4; i <= 4; i++) {
      const vFront = new THREE.Mesh(ventSlotGeo, ventMat);
      vFront.position.set(i * 1.3, topY, halfD - 0.4);
      root.add(vFront);

      const vRear = new THREE.Mesh(ventSlotGeo, ventMat);
      vRear.position.set(i * 1.3, topY, -halfD + 0.4);
      root.add(vRear);
    }
  }

  // 4. Painel de LEDs inclinado no topo (controlado por config.frontPanel.ledCount)
  const topY = height / 2 + 0.02;
  if (config.frontPanel.ledCount > 0) {
    const ledTopGroup = new THREE.Group();
    ledTopGroup.name = 'Element_Top_LEDs';
    ledTopGroup.userData = {
      isSelectable: true,
      elementId: 'leds',
      elementName: 'LEDs de Status (Topo)',
      baseX: width * 0.28,
      baseY: 0
    };

    const ledCount = Math.min(8, config.frontPanel.ledCount);
    const ledPanelGeo = new THREE.BoxGeometry(ledCount * 0.6 + 0.6, 0.05, 1.2);
    const ledPanelMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.4 });
    const ledPanel = new THREE.Mesh(ledPanelGeo, ledPanelMat);
    ledPanel.position.set(0, topY, -depth * 0.25);
    ledTopGroup.add(ledPanel);

    const topLedGeo = new THREE.BoxGeometry(0.12, 0.08, 0.12);
    const isLit = config.frontPanel.ledStatus;
    const topLedMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: isLit ? 0x22c55e : 0x000000,
      emissiveIntensity: isLit ? 0.9 : 0.0
    });
    for (let i = 0; i < ledCount; i++) {
      const topLed = new THREE.Mesh(topLedGeo, topLedMat);
      topLed.position.set(-(ledCount * 0.6) / 2 + 0.3 + i * 0.6, topY + 0.05, -depth * 0.25);
      ledTopGroup.add(topLed);
    }

    applyElementTransform(ledTopGroup, config, 'leds', width * 0.28, 0, 0, 0, 0, 0, 'top');
    root.add(ledTopGroup);
  }

  // 5. PAINEL FRONTAL
  const frontZ = depth / 2 + 0.02;

  // Moldura clara de acrílico frontal (somente se houver portas frontais)
  const totalFrontPorts = config.ports.rj45LanCount + config.ports.rj45WanCount + config.ports.sfpCount;
  if (totalFrontPorts > 0 || config.power.type !== 'none') {
    const faceplateGeo = new THREE.BoxGeometry(width * 0.95, height * 0.78, 0.05);
    const faceplateMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.5 });
    const faceplate = new THREE.Mesh(faceplateGeo, faceplateMat);
    faceplate.position.set(0, 0, frontZ);
    root.add(faceplate);
  }

  // A. Conector DC Barrel redondo (se ativado na fonte)
  if (config.power.type === 'dc_barrel' || config.power.type === 'dual_dc_barrel') {
    const dcGroup = new THREE.Group();
    dcGroup.name = 'Element_DC_Power';
    dcGroup.userData = {
      isSelectable: true,
      elementId: 'power',
      elementName: 'Conector de Fonte DC (12V)'
    };

    const dcRingGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.35, 16);
    dcRingGeo.rotateX(Math.PI / 2);
    const dcRing = new THREE.Mesh(dcRingGeo, new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3 }));
    dcRing.position.set(0, 0, 0.1);
    dcGroup.add(dcRing);

    const dcHoleGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.4, 16);
    dcHoleGeo.rotateX(Math.PI / 2);
    const dcHole = new THREE.Mesh(dcHoleGeo, new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.95 }));
    dcHole.position.set(0, 0, 0.15);
    dcGroup.add(dcHole);

    applyElementTransform(dcGroup, config, 'power', -width * 0.40, 0, frontZ, 0, 0, 0, 'front');
    root.add(dcGroup);
  }

  // B. Portas SFP (controlado por config.ports.sfpCount)
  if (config.ports.sfpCount > 0) {
    const sfpPort = createOpticalPort({ kind: 'sfp', ledStatus: config.frontPanel.ledStatus });
    sfpPort.name = 'Element_SFP_Port';
    sfpPort.userData = {
      isSelectable: true,
      elementId: 'optical',
      elementName: 'Porta Óptica SFP (1G)'
    };
    applyElementTransform(sfpPort, config, 'optical', -width * 0.25, 0, frontZ, 0, 0, 0, 'front');
    root.add(sfpPort);
  }

  // C. Portas RJ45 (controlado por lanCount e wanCount)
  const rj45Total = config.ports.rj45LanCount + config.ports.rj45WanCount;
  if (rj45Total > 0) {
    const rj45Group = new THREE.Group();
    rj45Group.name = 'Element_RJ45_Block';
    rj45Group.userData = {
      isSelectable: true,
      elementId: 'rj45',
      elementName: 'Portas Ethernet RJ45'
    };

    const rj45Spacing = 1.62;
    const startX = config.ports.sfpCount > 0 ? -width * 0.08 : -width * 0.25;
    let idx = 0;

    // WAN (PoE In)
    for (let i = 0; i < config.ports.rj45WanCount; i++) {
      const port = createRJ45Port({
        type: 'wan',
        ledStatus: config.frontPanel.ledStatus,
        isDomestic: false
      });
      port.position.set(startX + idx * rj45Spacing, 0, 0);
      rj45Group.add(port);
      idx++;
    }

    // LAN (PoE Out)
    for (let i = 0; i < config.ports.rj45LanCount; i++) {
      const port = createRJ45Port({
        type: 'lan',
        ledStatus: config.frontPanel.ledStatus,
        isDomestic: false
      });
      port.position.set(startX + idx * rj45Spacing, 0, 0);
      rj45Group.add(port);
      idx++;
    }

    applyElementTransform(rj45Group, config, 'rj45', 0, 0, frontZ, 0, 0, 0, 'front');
    root.add(rj45Group);
  }

  // 6. LATERAL DIREITA: Botões MODE, RESET e Porta USB (totalmente opcionais)
  const rightX = width / 2 + 0.02;
  const sideZ = 0;

  if (config.frontPanel.hasWpsButton) {
    const modeBtnGeo = new THREE.BoxGeometry(0.15, 0.6, 0.3);
    const modeBtn = new THREE.Mesh(modeBtnGeo, new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4 }));
    modeBtn.position.set(rightX, 0, sideZ - 1.2);
    root.add(modeBtn);
  }

  if (config.frontPanel.hasResetHole) {
    const resetBtnGeo = new THREE.BoxGeometry(0.15, 0.6, 0.3);
    const resetBtn = new THREE.Mesh(resetBtnGeo, new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4 }));
    resetBtn.position.set(rightX, 0, sideZ - 0.4);
    root.add(resetBtn);
  }

  if (config.ports.usbPortCount > 0) {
    const usbSide = createUSBPort();
    usbSide.name = 'Element_USB_Port';
    usbSide.userData = {
      isSelectable: true,
      elementId: 'usb',
      elementName: 'Porta USB 3.0'
    };
    applyElementTransform(usbSide, config, 'usb', rightX, 0, sideZ + 0.6, 0, Math.PI / 2, Math.PI / 2, 'right');
    root.add(usbSide);
  }

  // Chave Liga/Desliga Independente e Reposicionável
  if (config.power.hasPowerSwitch) {
    const pwrSwitch = createPowerSwitchModule(config.power.powerLedOn);
    const baseSwitchX = width * 0.38;
    pwrSwitch.userData = {
      isSelectable: true,
      elementId: 'power_switch',
      elementName: 'Chave Liga / Desliga (Power Switch)',
      isRear: true
    };
    applyElementTransform(pwrSwitch, config, 'power_switch', baseSwitchX, 0, -depth / 2, 0, Math.PI, 0, 'rear');
    root.add(pwrSwitch);
  }

  return root;
}
