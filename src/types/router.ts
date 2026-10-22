export type ChassisType =
  | 'desktop_router'
  | 'mikrotik_hex_s'
  | 'intelbras_r3005g'
  | 'cisco_modular_1u'
  | 'rack_1u'
  | 'rack_2u'
  | 'mini_switch'
  | 'custom_empty';

export type PowerSupplyType =
  | 'dc_barrel'
  | 'iec_c14'
  | 'dual_iec_c14'
  | 'dual_dc_barrel'
  | 'hot_swap_psu'
  | 'dual_hot_swap_psu'
  | 'none';

export type RJ45Arrangement = 'single_row' | 'double_row';

export type AntennaPlacement = 'rear' | 'sides' | 'rear_and_sides';

export type PortPanelPosition = 'auto' | 'front' | 'rear';

export type ModularSlot1Type = 'blank' | 'nim_1x_10g' | 'qsfp_100g' | 'dual_qsfp' | 'dual_sfp28';

export type ModularSlot2Type = 'blank' | 'sm_x_20rj_2sfp' | 'rj45_8p' | 'sfp_plus_4p' | 'sfp28_4p' | 'combo_4rj_2sfp';

export type BezelStyle = 'flat' | 'recessed' | 'beveled' | 'chamfered';

export interface AccessoriesConfig {
  perforatedGrill: boolean;      // Ferragem com furos para respiro (imagem 1)
  grillWidth?: number;           // Largura da grelha de respiro (cm)
  grillPosition?: 'front' | 'rear';
  fanTrayCount?: number;         // Gaveta de coolers modular (0 a 3 ventoinhas)
  hasRackHandles?: boolean;      // Alças de manuseio de rack frontais
  hasGroundingLug?: boolean;     // Parafuso duplo de aterramento (Ground Lug)
}

export interface RouterConfig {
  name: string;
  chassis: {
    type: ChassisType;
    width: number;       // em cm
    height: number;      // em cm
    depth: number;       // em cm
    cornerRadius: number;// arredondamento
    hasRackEars: boolean;
    ventilationSides: boolean;
    ventilationTop: boolean;
    baseColor: string;
    bodyMetallic: number;
    bodyRoughness: number;
    bezelStyle?: BezelStyle;       // Modelagem da moldura/rebaixo frontal
    bezelDepth?: number;           // Profundidade do rebaixo da frente (cm)
    bezelThickness?: number;       // Espessura da borda/moldura frontal (cm)
    sideLouvers?: boolean;         // Fendas/grelhas de ventilação estampadas na chapa lateral
  };
  ports: {
    rj45LanCount: number;
    rj45WanCount: number;
    rj45Arrangement: RJ45Arrangement;
    panelPosition?: PortPanelPosition;
    sfpCount: number;      // 1G
    sfpPlusCount: number;  // 10G
    sfp28Count: number;    // 25G
    qsfpCount: number;     // 40G / 100G
    hasConsolePort: boolean;
    usbPortCount: number;
  };
  modular?: {
    enabled: boolean;
    slot1: ModularSlot1Type; // Slot NIM médio (ex: 1x 10G SFP+, 100G QSFP, etc)
    slot2: ModularSlot2Type; // Slot SM-X largo (ex: 20x RJ45 + 2x SFP+, etc)
  };
  power: {
    type: PowerSupplyType;
    hasPowerSwitch: boolean;
    powerLedOn: boolean;
  };
  antennas: {
    count: number;
    placement: AntennaPlacement;
    height: number;
    angle: number; // rotação em graus
    color: string;
  };
  frontPanel: {
    ledCount: number;
    ledStatus: boolean;
    hasResetHole: boolean;
    hasWpsButton: boolean;
    hasOledScreen: boolean;
  };
  accessories?: AccessoriesConfig;
  offsets?: Partial<Record<ElementId, ElementOffset>>;
  labels?: TextLabelConfig[];
}

export type TextLabelStyle = 'silkscreen' | 'badge' | 'metallic' | 'tape_warning';
export type ChassisFace = 'front' | 'rear' | 'top' | 'bottom' | 'left' | 'right';

export interface TextLabelConfig {
  id: string;
  text: string;
  fontSize?: number;
  textColor?: string;
  bgColor?: string;
  style?: TextLabelStyle;
  face?: ChassisFace;
  x: number;
  y: number;
  z: number;
  rotX?: number;
  rotY?: number;
  rotZ?: number;
  scale?: number;
}

export type ElementId =
  | 'rj45'
  | 'optical'
  | 'power'
  | 'power_switch'
  | 'console'
  | 'usb'
  | 'leds'
  | 'oled'
  | 'wps_reset'
  | 'slot1'
  | 'slot2'
  | 'fixed_ports'
  | 'psu_module'
  | 'psu_module_2'
  | 'perforated_grill'
  | 'fan_tray'
  | 'rack_handles'
  | 'grounding_lug'
  | 'antennas'
  | (string & {});

export interface ElementOffset {
  x: number;
  y: number;
  z?: number;
  rotX?: number;
  rotY?: number;
  rotZ?: number;
  face?: ChassisFace;
  scale?: number;     // Escala uniforme (ex: 0.5 a 3.0)
  scaleX?: number;    // Escala no eixo X
  scaleY?: number;    // Escala no eixo Y
  scaleZ?: number;    // Escala no eixo Z
  hidden?: boolean;   // Se true, esconde/apaga a peça individualmente
}

export type PaintTool = 'brush' | 'bucket' | 'eraser' | 'picker' | 'decal';

export interface PaintSettings {
  tool: PaintTool;
  color: string;
  brushSize: number;
  opacity: number;
  roughness: number;
  metallic: number;
  isEmissive: boolean;
  activeDecal?: string;
  customText?: string;
}

export interface DecalItem {
  id: string;
  name: string;
  category: 'label' | 'logo' | 'icon' | 'port';
  svg: string;
}

