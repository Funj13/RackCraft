import * as THREE from 'three';
import { RouterConfig } from '../types/router';
import { TextureManager } from '../painter/TextureManager';
import { applyRouterBoxUVs } from './UVAtlas';
import { createModularSlot1, createModularSlot2 } from './ModularSlots';
import { createRJ45Port } from './PortsRJ45';
import { createOpticalPort } from './PortsOptical';
import { createUSBPort, createRackEars } from './FrontPanelDetails';
import { createPowerConnectorGroup, createPowerSwitchModule } from './PowerConnectors';
import { createHotSwapPSUModule, createPerforatedGrillPlate } from './HardwareAccessories';
import { applyElementTransform } from './TransformHelper';

/**
 * Constrói o modelo de roteador modular corporativo Cisco Catalyst Edge Router
 * com layout frontal exato da foto:
 * - Porta USB 3.0
 * - 1x Porta MGMT / Console RJ45 (com borda/traço azul)
 * - 4x Portas Gigabit RJ-45 (organizadas em 2 colunas x 2 linhas)
 * - 2x Portas 10G SFP+ (empilhadas verticalmente: 1 coluna x 2 linhas)
 * - Slot 1 (40G / 100G QSFP)
 * - Slot 2 (Placas de Expansão Versáteis 1G/10G/25G)
 */
export function buildCiscoModular(config: RouterConfig, textureManager: TextureManager): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Cisco_Modular_Edge_Router';

  const width = config.chassis.width || 44.0;
  const height = config.chassis.height || 4.4;
  const depth = config.chassis.depth || 26.0;

  // 1. Chassi Metálico Perfurado Branco/Cinza Claro
  const chassisGeo = new THREE.BoxGeometry(width, height, depth);
  applyRouterBoxUVs(chassisGeo, textureManager.faceRegions, textureManager.size);

  const chassisMat = new THREE.MeshStandardMaterial({
    map: textureManager.threeTexture,
    roughness: 0.35,
    metalness: 0.65
  });

  const chassisMesh = new THREE.Mesh(chassisGeo, chassisMat);
  chassisMesh.name = 'Cisco_Chassis_Body';
  chassisMesh.castShadow = true;
  chassisMesh.receiveShadow = true;
  chassisMesh.userData = { isPaintable: true };
  root.add(chassisMesh);

  // 2. Orelhas de Rack Pretas
  const rackEars = createRackEars(width, height);
  root.add(rackEars);

  // 3. Pés de Borracha na base
  const footGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.15, 12);
  const footMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.9 });
  const fx = width * 0.42;
  const fz = depth * 0.38;
  const fy = -height / 2 - 0.07;
  [[-fx, -fz], [fx, -fz], [-fx, fz], [fx, fz]].forEach(([x, z]) => {
    const foot = new THREE.Mesh(footGeo, footMat);
    foot.position.set(x, fy, z);
    root.add(foot);
  });

  const frontZ = depth / 2 + 0.02;
  const rearZ = -depth / 2 - 0.02;

  // ==============================================================
  // ZONA FIXA DA ESQUERDA (EXATAMENTE COMO NA FOTO DA CISCO):
  // 1. Porta USB 3.0 vertical e LEDs de status
  // 2. 1x Porta MGMT / Console RJ45 (anel azul)
  // 3. 4x Portas RJ45 Gigabit (2 colunas x 2 linhas com moldura amarela)
  // 4. 2x Portas 10G SFP+ (empilhadas verticalmente em 2 linhas)
  // ==============================================================

  const fixedGroup = new THREE.Group();
  fixedGroup.name = 'Cisco_Fixed_Ports_Block';

  // A. LEDs de status (STAT, PWR, ACT)
  const ledColors = [0x22c55e, 0x22c55e, 0x38bdf8];
  for (let i = 0; i < 3; i++) {
    const ledGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.1, 12);
    ledGeo.rotateX(Math.PI / 2);
    const led = new THREE.Mesh(
      ledGeo,
      new THREE.MeshStandardMaterial({
        color: ledColors[i],
        emissive: ledColors[i],
        emissiveIntensity: 1.0
      })
    );
    led.position.set(-5.6 + i * 0.45, 1.25, 0);
    fixedGroup.add(led);
  }

  // B. Porta USB 3.0 vertical
  const usb = createUSBPort();
  usb.position.set(-5.6, -0.4, 0);
  fixedGroup.add(usb);

  // C. 1x Porta MGMT / Console RJ45 (com anel azul inferior característico)
  const mgmtPort = createRJ45Port({ type: 'console', ledStatus: false, isDomestic: false });
  mgmtPort.position.set(-4.0, 0, 0);
  fixedGroup.add(mgmtPort);

  // Placa de destaque amarela industrial de identificação das 4 portas RJ45 e 2 portas SFP+
  // Posicionada com margem limpa para NUNCA encobrir a blindagem ou os LEDs Rx/Tx
  const yellowLabelMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.5 });
  const yellowStripeGeo = new THREE.BoxGeometry(5.2, 0.10, 0.06);
  const yellowTopStripe = new THREE.Mesh(yellowStripeGeo, yellowLabelMat);
  yellowTopStripe.position.set(-0.55, 1.62, 0.05);
  fixedGroup.add(yellowTopStripe);

  const yellowBottomStripe = new THREE.Mesh(yellowStripeGeo, yellowLabelMat);
  yellowBottomStripe.position.set(-0.55, -1.62, 0.05);
  fixedGroup.add(yellowBottomStripe);

  // D. 4x PORTAS 1GB RJ-45 (2 colunas x 2 linhas)
  const rjSpacingX = 1.62;
  const rjSpacingY = 1.48;
  const rjBaseX = -2.2;

  for (let col = 0; col < 2; col++) {
    for (let row = 0; row < 2; row++) {
      const isTopRow = row === 0;
      const port = createRJ45Port({
        type: 'wan',
        ledStatus: config.frontPanel.ledStatus,
        isDomestic: false, // Metal cinza niquelado com profundidade real e 8 pinos individuais visíveis!
        latchPosition: isTopRow ? 'top' : 'bottom' // Linha de cima: trava e LEDs em cima; Linha de baixo: trava e LEDs embaixo!
      });
      const xPos = rjBaseX + col * rjSpacingX;
      const yPos = isTopRow ? rjSpacingY / 2 : -rjSpacingY / 2;
      port.position.set(xPos, yPos, 0);
      fixedGroup.add(port);
    }
  }

  // E. 2x PORTAS SFP+ 10G (empilhadas verticalmente: 1 coluna x 2 linhas)
  const sfpX = rjBaseX + 2 * rjSpacingX + 0.1;
  const sfpSpacingY = 1.35;

  for (let row = 0; row < 2; row++) {
    const sfpPort = createOpticalPort({
      kind: 'sfp_plus',
      ledStatus: config.frontPanel.ledStatus
    });
    const yPos = row === 0 ? sfpSpacingY / 2 : -sfpSpacingY / 2;
    sfpPort.position.set(sfpX, yPos, 0);
    fixedGroup.add(sfpPort);
  }

  fixedGroup.userData = {
    isSelectable: true,
    elementId: 'fixed_ports',
    elementName: 'Painel Fixo de Portas (Cisco)'
  };
  applyElementTransform(fixedGroup, config, 'fixed_ports', -width * 0.33, 0, frontZ, 0, 0, 0, 'front');
  root.add(fixedGroup);

  // ==============================================================
  // SLOTS MODULARES INTERCAMBIÁVEIS
  // ==============================================================

  // 2. SLOT MODULAR 1 (Centro: Slot Médio NIM - Placa 10G SFP+ C-NIM-1X)
  const slot1Type = config.modular?.slot1 || 'nim_1x_10g';
  const slot1 = createModularSlot1(slot1Type, config.frontPanel.ledStatus);
  slot1.name = 'Element_Modular_Slot_1';
  slot1.userData = {
    isSelectable: true,
    elementId: 'slot1',
    elementName: 'Slot 1: Placa de Rede NIM (10G/100G)'
  };
  applyElementTransform(slot1, config, 'slot1', -5.1, 0, frontZ, 0, 0, 0, 'front');
  root.add(slot1);

  // 3. SLOT MODULAR 2 (Direita: Slot Grande SM-X - Placa SM-X-E2-20UXF 20x RJ45 + 2x SFP+)
  const slot2Type = config.modular?.slot2 || 'sm_x_20rj_2sfp';
  const slot2 = createModularSlot2(slot2Type, config.frontPanel.ledStatus);
  slot2.name = 'Element_Modular_Slot_2';
  slot2.userData = {
    isSelectable: true,
    elementId: 'slot2',
    elementName: 'Slot 2: Placa de Expansão Larga SM-X'
  };
  applyElementTransform(slot2, config, 'slot2', 11.1, 0, frontZ, 0, 0, 0, 'front');
  root.add(slot2);

  // 4. Fonte de Alimentação na TRASEIRA
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
      type: config.power.type as any || 'iec_c14',
      hasSwitch: true
    });
    powerGroup.name = 'Element_Power_Group';
    const basePowerX = width * 0.35;
    powerGroup.userData = {
      isSelectable: true,
      elementId: 'power',
      elementName: 'Fonte de Alimentação',
      isRear: true
    };
    applyElementTransform(powerGroup, config, 'power', basePowerX, 0, rearZ, 0, Math.PI, 0, 'rear');
    root.add(powerGroup);
  }

  // Chave Liga/Desliga Independente e Reposicionável
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

  // Acessórios adicionais
  if (config.accessories?.perforatedGrill) {
    const grill = createPerforatedGrillPlate(config.accessories.grillWidth ?? 8.0, 3.6);
    const isRear = config.accessories.grillPosition === 'rear';
    const gz = isRear ? rearZ : frontZ;
    applyElementTransform(grill, config, 'perforated_grill', 0, 0, gz, 0, isRear ? Math.PI : 0, 0, isRear ? 'rear' : 'front');
    root.add(grill);
  }

  return root;
}
