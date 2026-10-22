import * as THREE from 'three';
import { RouterConfig } from '../types/router';
import { TextureManager } from '../painter/TextureManager';
import { applyRouterBoxUVs } from './UVAtlas';
import { createPowerConnectorGroup, getPowerBlockWidth, createPowerSwitchModule } from './PowerConnectors';
import { createRJ45PortBlock, createRJ45Port, getRJ45BlockWidth, RJ45_SPACING_Y } from './PortsRJ45';
import { createOpticalPortBlock, getOpticalBlockWidth } from './PortsOptical';
import { createAntennaSet } from './AntennaMesh';
import { createFrontPanelDetails, createRackEars, createUSBPort } from './FrontPanelDetails';
import { calculateFrontPanelLayout, calculateRearPanelLayout } from './PanelLayout';
import { buildMikroTikHexS } from './MikroTikHexS';
import { buildIntelbrasR3005G } from './IntelbrasR3005G';
import { buildCiscoModular } from './CiscoModular';
import {
  createHotSwapPSUModule,
  createPerforatedGrillPlate,
  createFanTrayModule,
  createRackHandles,
  createGroundingLugModule
} from './HardwareAccessories';
import { addTextLabelsToRouter } from './TextLabels';
import { applyElementTransform } from './TransformHelper';

export function buildCompleteRouter(config: RouterConfig, textureManager: TextureManager): THREE.Group {
  let model: THREE.Group;
  if (config.chassis.type === 'mikrotik_hex_s') {
    model = buildMikroTikHexS(config, textureManager);
  } else if (config.chassis.type === 'intelbras_r3005g') {
    model = buildIntelbrasR3005G(config, textureManager);
  } else if (config.chassis.type === 'cisco_modular_1u') {
    model = buildCiscoModular(config, textureManager);
  } else {
    model = buildStandardRouter(config, textureManager);
  }

  // Adiciona etiquetas de texto, serigrafias e plaquetas 3D em qualquer direção
  addTextLabelsToRouter(model, config);

  return model;
}

function buildStandardRouter(config: RouterConfig, textureManager: TextureManager): THREE.Group {
  const root = new THREE.Group();
  root.name = config.name || 'Network_Router_Hardware';

  const {
    width,
    height,
    depth,
    baseColor,
    bodyMetallic,
    bodyRoughness,
    hasRackEars,
    bezelStyle,
    bezelDepth: customBezelDepth,
    bezelThickness: customBezelThick,
    sideLouvers
  } = config.chassis;

  // Chassi Principal com UV Mapping
  const chassisGeo = new THREE.BoxGeometry(width, height, depth);
  applyRouterBoxUVs(chassisGeo, textureManager.faceRegions, textureManager.size);

  const chassisMat = new THREE.MeshStandardMaterial({
    map: textureManager.threeTexture,
    roughness: bodyRoughness ?? 0.6,
    metalness: bodyMetallic ?? 0.2,
  });

  const chassisMesh = new THREE.Mesh(chassisGeo, chassisMat);
  chassisMesh.name = 'Chassis_Body';
  chassisMesh.castShadow = true;
  chassisMesh.receiveShadow = true;
  chassisMesh.userData = { isPaintable: true };
  root.add(chassisMesh);

  // Modelagem de Moldura Rebaixada (Recessed Bezel) no painel frontal
  if (bezelStyle === 'recessed' || bezelStyle === 'chamfered') {
    const borderThick = customBezelThick || 0.25;
    const bDepth = customBezelDepth || 0.3;
    const bWidth = Math.max(width - borderThick * 2, 2);
    const bHeight = Math.max(height - borderThick * 2, 1);
    const frontFaceZ = depth / 2;

    const bezelFaceGeo = new THREE.PlaneGeometry(bWidth, bHeight);
    const bezelMat = new THREE.MeshStandardMaterial({
      color: 0x11161f,
      roughness: 0.8,
      metalness: 0.2
    });
    const bezelFace = new THREE.Mesh(bezelFaceGeo, bezelMat);
    bezelFace.position.set(0, 0, frontFaceZ - bDepth + 0.01);
    root.add(bezelFace);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x090d14, roughness: 0.85, metalness: 0.2 });
    // Paredes internas da moldura
    const topW = new THREE.Mesh(new THREE.BoxGeometry(bWidth, 0.04, bDepth), wallMat);
    topW.position.set(0, bHeight / 2, frontFaceZ - bDepth / 2);
    root.add(topW);
    const botW = new THREE.Mesh(new THREE.BoxGeometry(bWidth, 0.04, bDepth), wallMat);
    botW.position.set(0, -bHeight / 2, frontFaceZ - bDepth / 2);
    root.add(botW);
    const leftW = new THREE.Mesh(new THREE.BoxGeometry(0.04, bHeight, bDepth), wallMat);
    leftW.position.set(-bWidth / 2, 0, frontFaceZ - bDepth / 2);
    root.add(leftW);
    const rightW = new THREE.Mesh(new THREE.BoxGeometry(0.04, bHeight, bDepth), wallMat);
    rightW.position.set(bWidth / 2, 0, frontFaceZ - bDepth / 2);
    root.add(rightW);
  }

  // Modelagem de Fendas Laterais Estampadas (Side Louvers)
  if (sideLouvers) {
    const louverMat = new THREE.MeshStandardMaterial({ color: 0x0a0f16, roughness: 0.95 });
    const louverGeo = new THREE.BoxGeometry(0.06, 0.12, Math.min(depth * 0.45, 1.4));
    const count = 12;
    const spacing = 0.24;
    for (let i = 0; i < count; i++) {
      const lz = (i - (count - 1) / 2) * spacing;
      const lL = new THREE.Mesh(louverGeo, louverMat);
      lL.position.set(-width / 2 - 0.01, 0, lz);
      root.add(lL);
      const lR = new THREE.Mesh(louverGeo, louverMat);
      lR.position.set(width / 2 + 0.01, 0, lz);
      root.add(lR);
    }
  }

  // Pés de Borracha na Base
  const footGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.15, 12);
  const footMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.9 });
  const footOffsetX = width * 0.42;
  const footOffsetZ = depth * 0.38;
  const footY = -height / 2 - 0.07;

  [
    [-footOffsetX, -footOffsetZ],
    [footOffsetX, -footOffsetZ],
    [-footOffsetX, footOffsetZ],
    [footOffsetX, footOffsetZ]
  ].forEach(([fx, fz], idx) => {
    const foot = new THREE.Mesh(footGeo, footMat);
    foot.name = `Rubber_Foot_${idx + 1}`;
    foot.position.set(fx, footY, fz);
    root.add(foot);
  });

  // Orelhas de fixação em rack (Rack Ears)
  if (hasRackEars || config.chassis.type.startsWith('rack')) {
    const rackEars = createRackEars(width, height);
    root.add(rackEars);
  }

  const isRackType = config.chassis.type.startsWith('rack');
  // As portas amarelas são APENAS para o roteador doméstico Wi-Fi!
  const isDomestic = config.chassis.type === 'desktop_router';

  const panelPos = config.ports.panelPosition || 'auto';
  const portsOnFront = panelPos === 'front' || (panelPos === 'auto' && isRackType);

  const frontZ = depth / 2 + 0.02;
  const rearZ = -depth / 2 - 0.02;

  // Medições de largura dos blocos
  const doubleRow = config.ports.rj45Arrangement === 'double_row';
  const rj45Width = getRJ45BlockWidth(config.ports.rj45LanCount, config.ports.rj45WanCount, doubleRow);
  const opticalWidth = getOpticalBlockWidth(
    config.ports.sfpCount,
    config.ports.sfpPlusCount,
    config.ports.sfp28Count,
    config.ports.qsfpCount
  );
  const powerWidth = getPowerBlockWidth(config.power.type);
  const consoleWidth = config.ports.hasConsolePort ? 1.8 : 0;
  const usbWidth = config.ports.usbPortCount > 0 ? 1.8 : 0;
  const ledsWidth = config.frontPanel.ledCount > 0 ? (config.frontPanel.ledCount * 0.55 + 0.8) : 0;

  if (portsOnFront) {
    const layout = calculateFrontPanelLayout(
      width,
      height,
      rj45Width,
      opticalWidth,
      consoleWidth + usbWidth,
      ledsWidth
    );

    const safeScale = layout.scale;

    if (config.ports.hasConsolePort) {
      const consolePort = createRJ45Port({ type: 'console', ledStatus: false, isDomestic: false });
      consolePort.name = 'Element_Console_Port';
      consolePort.userData = {
        isSelectable: true,
        elementId: 'console',
        elementName: 'Porta Console RJ45'
      };
      applyElementTransform(consolePort, config, 'console', layout.consoleX, 0, frontZ, 0, 0, 0, 'front');
      consolePort.scale.set(safeScale, safeScale, 1);
      root.add(consolePort);
    }

    if (config.ports.usbPortCount > 0) {
      const usb = createUSBPort();
      usb.name = 'Element_USB_Port';
      const usbBaseX = config.ports.hasConsolePort ? layout.consoleX + 1.8 * safeScale : layout.consoleX;
      usb.userData = {
        isSelectable: true,
        elementId: 'usb',
        elementName: 'Porta USB 3.0'
      };
      applyElementTransform(usb, config, 'usb', usbBaseX, 0, frontZ, 0, 0, 0, 'front');
      usb.scale.set(safeScale, safeScale, 1);
      root.add(usb);
    }

    if (rj45Width > 0) {
      const rj45Block = createRJ45PortBlock(
        config.ports.rj45LanCount,
        config.ports.rj45WanCount,
        doubleRow,
        config.frontPanel.ledStatus,
        isDomestic
      );
      rj45Block.name = 'Element_RJ45_Block';
      rj45Block.userData = {
        isSelectable: true,
        elementId: 'rj45',
        elementName: 'Portas Ethernet RJ45'
      };
      applyElementTransform(rj45Block, config, 'rj45', layout.rj45X, 0, frontZ, 0, 0, 0, 'front');
      rj45Block.scale.set(safeScale, safeScale, 1);
      root.add(rj45Block);
    }

    if (opticalWidth > 0) {
      const opticalBlock = createOpticalPortBlock(
        config.ports.sfpCount,
        config.ports.sfpPlusCount,
        config.ports.sfp28Count,
        config.ports.qsfpCount,
        config.frontPanel.ledStatus
      );
      opticalBlock.name = 'Element_Optical_Block';
      opticalBlock.userData = {
        isSelectable: true,
        elementId: 'optical',
        elementName: 'Portas Ópticas (SFP/QSFP)'
      };
      applyElementTransform(opticalBlock, config, 'optical', layout.opticalX, 0, frontZ, 0, 0, 0, 'front');
      opticalBlock.scale.set(safeScale, safeScale, 1);
      root.add(opticalBlock);
    }

    const frontDetails = createFrontPanelDetails({
      width,
      height,
      depth,
      ledCount: config.frontPanel.ledCount,
      ledStatus: config.frontPanel.ledStatus,
      hasResetHole: config.frontPanel.hasResetHole,
      hasWpsButton: config.frontPanel.hasWpsButton,
      hasOledScreen: config.frontPanel.hasOledScreen
    });
    frontDetails.name = 'Element_Front_Details';
    frontDetails.userData = {
      isSelectable: true,
      elementId: 'leds',
      elementName: 'Painel Frontal & LEDs'
    };
    applyElementTransform(frontDetails, config, 'leds', 0, 0, 0, 0, 0, 0, 'front');
    root.add(frontDetails);

    addPowerSupply(root, config, width, rearZ);
  } else {
    const rearLayout = calculateRearPanelLayout(width, rj45Width, powerWidth, opticalWidth);
    const safeScale = rearLayout.scale;

    if (rj45Width > 0) {
      const rj45Block = createRJ45PortBlock(
        config.ports.rj45LanCount,
        config.ports.rj45WanCount,
        doubleRow,
        config.frontPanel.ledStatus,
        isDomestic
      );
      rj45Block.name = 'Element_RJ45_Block';
      rj45Block.userData = {
        isSelectable: true,
        elementId: 'rj45',
        elementName: 'Portas Ethernet RJ45',
        isRear: true
      };
      applyElementTransform(rj45Block, config, 'rj45', rearLayout.rj45X, 0, rearZ, 0, Math.PI, 0, 'rear');
      rj45Block.scale.set(safeScale, safeScale, 1);
      root.add(rj45Block);
    }

    if (opticalWidth > 0) {
      const opticalBlock = createOpticalPortBlock(
        config.ports.sfpCount,
        config.ports.sfpPlusCount,
        config.ports.sfp28Count,
        config.ports.qsfpCount,
        config.frontPanel.ledStatus
      );
      opticalBlock.name = 'Element_Optical_Block';
      opticalBlock.userData = {
        isSelectable: true,
        elementId: 'optical',
        elementName: 'Portas Ópticas (SFP/QSFP)',
        isRear: true
      };
      applyElementTransform(opticalBlock, config, 'optical', rearLayout.opticalX, 0, rearZ, 0, Math.PI, 0, 'rear');
      opticalBlock.scale.set(safeScale, safeScale, 1);
      root.add(opticalBlock);
    }

    addPowerSupply(root, config, width, rearZ);

    const frontDetails = createFrontPanelDetails({
      width,
      height,
      depth,
      ledCount: config.frontPanel.ledCount,
      ledStatus: config.frontPanel.ledStatus,
      hasResetHole: config.frontPanel.hasResetHole,
      hasWpsButton: config.frontPanel.hasWpsButton,
      hasOledScreen: config.frontPanel.hasOledScreen
    });
    frontDetails.name = 'Element_Front_Details';
    frontDetails.userData = {
      isSelectable: true,
      elementId: 'leds',
      elementName: 'Painel Frontal & LEDs'
    };
    applyElementTransform(frontDetails, config, 'leds', 0, 0, 0, 0, 0, 0, 'front');
    root.add(frontDetails);
  }

  // Ferragens e Acessórios Adicionais (Grelhas de Respiro, Coolers, Alças, Aterramento)
  addAccessories(root, config, width, height, frontZ, rearZ);

  // Antenas Wi-Fi
  if (config.antennas.count > 0) {
    const antennaGroup = createAntennaSet(
      config.antennas.count,
      width,
      depth,
      height,
      config.antennas.placement,
      config.antennas.height,
      config.antennas.angle,
      config.antennas.color
    );
    root.add(antennaGroup);
  }

  return root;
}

function addPowerSupply(root: THREE.Group, config: RouterConfig, width: number, rearZ: number) {
  if (config.power.type === 'hot_swap_psu') {
    const psu = createHotSwapPSUModule(1);
    const baseX = width * 0.28;
    applyElementTransform(psu, config, 'psu_module', baseX, 0, rearZ, 0, Math.PI, 0, 'rear');
    root.add(psu);
  } else if (config.power.type === 'dual_hot_swap_psu') {
    const psu1 = createHotSwapPSUModule(1);
    const base1X = width * 0.16;
    applyElementTransform(psu1, config, 'psu_module', base1X, 0, rearZ, 0, Math.PI, 0, 'rear');
    root.add(psu1);

    const psu2 = createHotSwapPSUModule(2);
    const base2X = width * 0.36;
    applyElementTransform(psu2, config, 'psu_module_2', base2X, 0, rearZ, 0, Math.PI, 0, 'rear');
    root.add(psu2);
  } else if (config.power.type !== 'none') {
    const powerGroup = createPowerConnectorGroup({
      type: config.power.type as any
    });
    powerGroup.name = 'Element_Power_Group';
    const basePowerX = width * 0.36;
    powerGroup.userData = {
      isSelectable: true,
      elementId: 'power',
      elementName: 'Fonte de Alimentação',
      isRear: true
    };
    applyElementTransform(powerGroup, config, 'power', basePowerX, 0, rearZ, 0, Math.PI, 0, 'rear');
    root.add(powerGroup);
  }

  // Chave Liga/Desliga Independente e Reposicionável Livremente no Chassi
  if (config.power.hasPowerSwitch) {
    const pwrSwitch = createPowerSwitchModule(config.power.powerLedOn);
    const baseSwitchX = width * 0.44;
    pwrSwitch.userData = {
      isSelectable: true,
      elementId: 'power_switch',
      elementName: 'Chave Liga / Desliga (Power Switch)',
      isRear: true
    };
    applyElementTransform(pwrSwitch, config, 'power_switch', baseSwitchX, 0, rearZ, 0, Math.PI, 0, 'rear');
    root.add(pwrSwitch);
  }
}

function addAccessories(
  root: THREE.Group,
  config: RouterConfig,
  width: number,
  height: number,
  frontZ: number,
  rearZ: number
) {
  if (!config.accessories) return;

  // 1. Ferragem com furos para respiro (Imagem 1)
  if (config.accessories.perforatedGrill) {
    const grillW = config.accessories.grillWidth ?? Math.min(10, width * 0.3);
    const grillH = Math.min(3.6, height * 0.82);
    const grill = createPerforatedGrillPlate(grillW, grillH);
    const isRear = config.accessories.grillPosition === 'rear';
    const gz = isRear ? rearZ : frontZ;
    applyElementTransform(grill, config, 'perforated_grill', 0, 0, gz, 0, isRear ? Math.PI : 0, 0, isRear ? 'rear' : 'front');
    root.add(grill);
  }

  // 2. Gaveta de coolers modular
  if (config.accessories.fanTrayCount && config.accessories.fanTrayCount > 0) {
    const fanTray = createFanTrayModule(config.accessories.fanTrayCount, Math.min(3.6, height * 0.82));
    applyElementTransform(fanTray, config, 'fan_tray', 0, 0, rearZ, 0, Math.PI, 0, 'rear');
    root.add(fanTray);
  }

  // 3. Alças de manuseio frontais de rack
  if (config.accessories.hasRackHandles) {
    const handles = createRackHandles(width, height);
    applyElementTransform(handles, config, 'rack_handles', 0, 0, frontZ, 0, 0, 0, 'front');
    root.add(handles);
  }

  // 4. Ponto de aterramento duplo
  if (config.accessories.hasGroundingLug) {
    const lug = createGroundingLugModule();
    const baseLugX = -width * 0.42;
    applyElementTransform(lug, config, 'grounding_lug', baseLugX, 0, rearZ, 0, Math.PI, 0, 'rear');
    root.add(lug);
  }
}
