import React, { useState } from 'react';
import {
  RouterConfig,
  ChassisType,
  PowerSupplyType,
  RJ45Arrangement,
  AntennaPlacement,
  PortPanelPosition,
  ModularSlot1Type,
  ModularSlot2Type,
  ElementId,
  AccessoriesConfig,
  TextLabelConfig,
  TextLabelStyle,
  ChassisFace
} from '../types/router';
import {
  Cpu,
  Zap,
  Wifi,
  Sliders,
  Box,
  Layers,
  HardDrive,
  Compass,
  LayoutGrid,
  ShieldCheck,
  Trash2,
  Activity,
  Sparkles,
  Move,
  RotateCcw,
  Fan,
  Wind,
  Wrench,
  CheckCircle2,
  Type,
  Plus,
  Tag,
  Copy,
  Crosshair,
  MousePointer
} from 'lucide-react';
import { getDefaultFaceCoordinates } from '../generator/TextLabels';

interface SidebarHardwareProps {
  config: RouterConfig;
  onChange: (updater: (prev: RouterConfig) => RouterConfig) => void;
  onPresetColorChange?: (color: string) => void;
  selectedElementId?: ElementId | null;
  onSelectElement?: (id: ElementId | null) => void;
  onEnterWriteMode?: () => void;
}

export const SidebarHardware: React.FC<SidebarHardwareProps> = ({
  config,
  onChange,
  onPresetColorChange,
  selectedElementId,
  onSelectElement,
  onEnterWriteMode
}) => {
  const [activeTab, setActiveTab] = useState<'ports' | 'hardware_extras' | 'text_labels'>('ports');
  const [selectedOffsetPiece, setSelectedOffsetPiece] = useState<ElementId>('rj45');
  const [labelInputText, setLabelInputText] = useState<string>('CISCO');
  const [labelStyle, setLabelStyle] = useState<TextLabelStyle>('silkscreen');
  const [labelTextColor, setLabelTextColor] = useState<string>('#ffffff');
  const [labelFace, setLabelFace] = useState<ChassisFace>('front');
  const [labelFontSize, setLabelFontSize] = useState<number>(56);

  const handleAddTextLabel = () => {
    if (!labelInputText.trim()) return;
    const newId = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    const defaultCoords = getDefaultFaceCoordinates(
      labelFace,
      config.chassis.width,
      config.chassis.height,
      config.chassis.depth
    );
    const newLabel: TextLabelConfig = {
      id: newId,
      text: labelInputText.trim(),
      style: labelStyle,
      textColor: labelTextColor,
      face: labelFace,
      fontSize: labelFontSize,
      x: defaultCoords.x,
      y: defaultCoords.y,
      z: defaultCoords.z,
      rotX: defaultCoords.rotX,
      rotY: defaultCoords.rotY,
      rotZ: defaultCoords.rotZ,
      scale: 1.0
    };
    onChange((prev) => ({
      ...prev,
      labels: [...(prev.labels || []), newLabel]
    }));
    // Seleciona imediatamente no Gizmo 3D para arrastar
    onSelectElement?.(`label_${newId}`);
  };

  const handleRemoveTextLabel = (id: string) => {
    onChange((prev) => ({
      ...prev,
      labels: prev.labels?.filter((l) => l.id !== id),
      offsets: prev.offsets ? Object.fromEntries(Object.entries(prev.offsets).filter(([k]) => k !== `label_${id}`)) : prev.offsets
    }));
  };

  const maxRangeX = Math.max(26, Math.ceil(config.chassis.width / 2 + 6));
  const maxRangeY = Math.max(6, Math.ceil(config.chassis.height / 2 + 2));

  const updateOffset = (elementId: ElementId, axis: 'x' | 'y', value: number) => {
    onChange((prev) => ({
      ...prev,
      offsets: {
        ...prev.offsets,
        [elementId]: {
          x: axis === 'x' ? value : (prev.offsets?.[elementId]?.x ?? 0),
          y: axis === 'y' ? value : (prev.offsets?.[elementId]?.y ?? 0)
        }
      }
    }));
  };
  // Limpa todos os detalhes deixando o chassi completamente liso e vazio para montagem manual
  const handleClearAllDetails = () => {
    onChange((prev) => ({
      ...prev,
      name: 'Chassi_Custom_Limpo',
      chassis: {
        ...prev.chassis,
        type: 'custom_empty',
        hasRackEars: false,
      },
      ports: {
        ...prev.ports,
        rj45LanCount: 0,
        rj45WanCount: 0,
        sfpCount: 0,
        sfpPlusCount: 0,
        sfp28Count: 0,
        qsfpCount: 0,
        hasConsolePort: false,
        usbPortCount: 0,
      },
      power: {
        ...prev.power,
        type: 'none',
        hasPowerSwitch: false,
      },
      antennas: {
        ...prev.antennas,
        count: 0,
      },
      frontPanel: {
        ...prev.frontPanel,
        ledCount: 0,
        hasResetHole: false,
        hasWpsButton: false,
        hasOledScreen: false,
      },
      modular: {
        enabled: false,
        slot1: 'blank',
        slot2: 'blank',
      },
      accessories: {
        perforatedGrill: false,
        grillWidth: 10,
        grillPosition: 'front',
        fanTrayCount: 0,
        hasRackHandles: false,
        hasGroundingLug: false
      },
      offsets: {}
    }));
  };

  const updateAccessories = (key: keyof AccessoriesConfig, value: any) => {
    onChange((prev) => ({
      ...prev,
      accessories: {
        perforatedGrill: prev.accessories?.perforatedGrill ?? false,
        grillWidth: prev.accessories?.grillWidth ?? 10,
        grillPosition: prev.accessories?.grillPosition ?? 'front',
        fanTrayCount: prev.accessories?.fanTrayCount ?? 0,
        hasRackHandles: prev.accessories?.hasRackHandles ?? false,
        hasGroundingLug: prev.accessories?.hasGroundingLug ?? false,
        [key]: value
      }
    }));
  };

  const updateChassis = (key: keyof RouterConfig['chassis'], value: any) => {
    onChange((prev) => ({
      ...prev,
      chassis: { ...prev.chassis, [key]: value }
    }));
  };

  const updatePorts = (key: keyof RouterConfig['ports'], value: any) => {
    onChange((prev) => ({
      ...prev,
      ports: { ...prev.ports, [key]: value }
    }));
  };

  const updatePower = (key: keyof RouterConfig['power'], value: any) => {
    onChange((prev) => ({
      ...prev,
      power: { ...prev.power, [key]: value }
    }));
  };

  const updateAntennas = (key: keyof RouterConfig['antennas'], value: any) => {
    onChange((prev) => ({
      ...prev,
      antennas: { ...prev.antennas, [key]: value }
    }));
  };

  const updateFrontPanel = (key: keyof RouterConfig['frontPanel'], value: any) => {
    onChange((prev) => ({
      ...prev,
      frontPanel: { ...prev.frontPanel, [key]: value }
    }));
  };

  const updateModular = (key: 'slot1' | 'slot2' | 'enabled', value: any) => {
    onChange((prev) => ({
      ...prev,
      modular: {
        enabled: key === 'enabled' ? value : (prev.modular?.enabled ?? true),
        slot1: key === 'slot1' ? value : (prev.modular?.slot1 ?? 'qsfp_100g'),
        slot2: key === 'slot2' ? value : (prev.modular?.slot2 ?? 'rj45_8p')
      }
    }));
  };

  // Presets industriais com proporções realistas de mercado
  const applyChassisPreset = (type: ChassisType) => {
    if (type === 'mikrotik_hex_s') {
      // Modelo fiel ao MikroTik hEX S 2025
      onChange((prev) => ({
        ...prev,
        name: 'MikroTik_hEX_S_2025',
        chassis: {
          ...prev.chassis,
          type,
          width: 14.0,
          height: 3.2,
          depth: 11.0,
          hasRackEars: false,
          baseColor: '#94a3b8',
          bodyMetallic: 0.15,
          bodyRoughness: 0.65
        },
        ports: {
          ...prev.ports,
          rj45LanCount: 4,
          rj45WanCount: 1,
          rj45Arrangement: 'single_row',
          panelPosition: 'front',
          sfpCount: 1,
          sfpPlusCount: 0,
          sfp28Count: 0,
          qsfpCount: 0,
          hasConsolePort: false,
          usbPortCount: 1
        },
        modular: {
          enabled: false,
          slot1: 'blank',
          slot2: 'blank'
        },
        power: {
          type: 'dc_barrel',
          hasPowerSwitch: false,
          powerLedOn: true
        },
        antennas: {
          ...prev.antennas,
          count: 0
        }
      }));
      onPresetColorChange?.('#94a3b8');
    } else if (type === 'intelbras_r3005g') {
      // Modelo fiel ao Intelbras R3005G (Imagem 2)
      onChange((prev) => ({
        ...prev,
        name: 'Intelbras_R3005G',
        chassis: {
          ...prev.chassis,
          type,
          width: 16.0,
          height: 3.0,
          depth: 10.8,
          hasRackEars: false,
          baseColor: '#22272e',
          bodyMetallic: 0.35,
          bodyRoughness: 0.65,
          bezelStyle: 'recessed',
          bezelDepth: 0.28,
          bezelThickness: 0.22,
          sideLouvers: true
        },
        ports: {
          ...prev.ports,
          rj45LanCount: 4,
          rj45WanCount: 1,
          rj45Arrangement: 'single_row',
          panelPosition: 'front',
          sfpCount: 0,
          sfpPlusCount: 0,
          sfp28Count: 0,
          qsfpCount: 0,
          hasConsolePort: false,
          usbPortCount: 1
        },
        modular: {
          enabled: false,
          slot1: 'blank',
          slot2: 'blank'
        },
        power: {
          type: 'dc_barrel',
          hasPowerSwitch: false,
          powerLedOn: true
        },
        frontPanel: {
          ...prev.frontPanel,
          ledCount: 7,
          ledStatus: true,
          hasResetHole: true
        },
        antennas: {
          ...prev.antennas,
          count: 0
        },
        offsets: {}
      }));
      onPresetColorChange?.('#22272e');
    } else if (type === 'cisco_modular_1u') {
      // Modelo fiel ao Cisco C8300-1N1S-4T2X do Sketchfab
      onChange((prev) => ({
        ...prev,
        name: 'Cisco_C8300_1N1S_4T2X',
        chassis: {
          ...prev.chassis,
          type,
          width: 44.0,
          height: 4.4,
          depth: 26.0,
          hasRackEars: true,
          baseColor: '#e2e8f0',
          bodyMetallic: 0.6,
          bodyRoughness: 0.4
        },
        modular: {
          enabled: true,
          slot1: 'nim_1x_10g',      // C-NIM-1X da foto (1x 10G SFP+)
          slot2: 'sm_x_20rj_2sfp'   // SM-X-E2-20UXF da foto (20x RJ45 + 2x SFP+)
        },
        ports: {
          ...prev.ports,
          rj45LanCount: 0,
          rj45WanCount: 2,
          rj45Arrangement: 'double_row',
          panelPosition: 'front',
          sfpCount: 0,
          sfpPlusCount: 1,
          sfp28Count: 0,
          qsfpCount: 0,
          hasConsolePort: true,
          usbPortCount: 1
        },
        power: {
          type: 'iec_c14',
          hasPowerSwitch: true,
          powerLedOn: true
        },
        antennas: {
          ...prev.antennas,
          count: 0
        }
      }));
      onPresetColorChange?.('#e2e8f0');
    } else if (type === 'desktop_router') {
      onChange((prev) => ({
        ...prev,
        name: 'Router_Wi-Fi_Domestico',
        chassis: {
          ...prev.chassis,
          type,
          width: 24,
          height: 3.8,
          depth: 16,
          hasRackEars: false,
          baseColor: '#1e293b'
        },
        modular: { enabled: false, slot1: 'blank', slot2: 'blank' },
        ports: {
          ...prev.ports,
          rj45LanCount: 4,
          rj45WanCount: 1,
          rj45Arrangement: 'single_row',
          panelPosition: 'rear',
          sfpCount: 0,
          sfpPlusCount: 0,
          sfp28Count: 0,
          qsfpCount: 0,
          hasConsolePort: false,
          usbPortCount: 0
        },
        power: {
          type: 'dc_barrel',
          hasPowerSwitch: true,
          powerLedOn: true
        },
        antennas: {
          ...prev.antennas,
          count: 2,
          placement: 'rear',
          height: 9,
          angle: 15
        }
      }));
    } else if (type === 'rack_1u') {
      onChange((prev) => ({
        ...prev,
        name: 'Switch_1U_Rack',
        chassis: {
          ...prev.chassis,
          type,
          width: 44,
          height: 4.4,
          depth: 22,
          hasRackEars: true,
          baseColor: '#334155'
        },
        modular: { enabled: false, slot1: 'blank', slot2: 'blank' },
        ports: {
          ...prev.ports,
          rj45LanCount: 24,
          rj45WanCount: 0,
          rj45Arrangement: 'double_row',
          panelPosition: 'front',
          sfpCount: 0,
          sfpPlusCount: 4,
          sfp28Count: 0,
          qsfpCount: 0,
          hasConsolePort: true,
          usbPortCount: 0
        },
        power: {
          type: 'iec_c14',
          hasPowerSwitch: true,
          powerLedOn: true
        },
        antennas: {
          ...prev.antennas,
          count: 0
        }
      }));
    } else if (type === 'rack_2u') {
      onChange((prev) => ({
        ...prev,
        name: 'Switch_2U_Core_Rack',
        chassis: {
          ...prev.chassis,
          type,
          width: 44,
          height: 8.8,
          depth: 28,
          hasRackEars: true,
          baseColor: '#1e293b'
        },
        modular: { enabled: false, slot1: 'blank', slot2: 'blank' },
        ports: {
          ...prev.ports,
          rj45LanCount: 48,
          rj45WanCount: 0,
          rj45Arrangement: 'double_row',
          panelPosition: 'front',
          sfpCount: 0,
          sfpPlusCount: 0,
          sfp28Count: 4,
          qsfpCount: 2,
          hasConsolePort: true,
          usbPortCount: 1
        },
        power: {
          type: 'dual_iec_c14',
          hasPowerSwitch: true,
          powerLedOn: true
        },
        antennas: {
          ...prev.antennas,
          count: 0
        }
      }));
    } else if (type === 'custom_empty') {
      onChange((prev) => ({
        ...prev,
        name: 'Chassi_Custom_Limpo',
        chassis: {
          ...prev.chassis,
          type: 'custom_empty',
          width: 28,
          height: 4.4,
          depth: 18,
          hasRackEars: false,
          baseColor: '#334155',
          bodyMetallic: 0.25,
          bodyRoughness: 0.55
        },
        modular: { enabled: false, slot1: 'blank', slot2: 'blank' },
        ports: {
          ...prev.ports,
          rj45LanCount: 0,
          rj45WanCount: 0,
          rj45Arrangement: 'single_row',
          panelPosition: 'front',
          sfpCount: 0,
          sfpPlusCount: 0,
          sfp28Count: 0,
          qsfpCount: 0,
          hasConsolePort: false,
          usbPortCount: 0
        },
        power: {
          type: 'none',
          hasPowerSwitch: false,
          powerLedOn: false
        },
        antennas: {
          ...prev.antennas,
          count: 0
        },
        frontPanel: {
          ...prev.frontPanel,
          ledCount: 0,
          ledStatus: true,
          hasResetHole: false,
          hasWpsButton: false,
          hasOledScreen: false
        }
      }));
      onPresetColorChange?.('#334155');
    }
  };

  const isModularActive = config.chassis.type === 'cisco_modular_1u' || (config.modular?.enabled && config.chassis.type !== 'custom_empty');

  return (
    <div className="w-80 h-full bg-slate-900 border-r border-slate-800 flex flex-col text-xs select-none overflow-hidden">
      {/* Cabeçalho */}
      <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-sky-400" />
          <span className="font-bold text-slate-100 text-sm">Gerador de Hardware</span>
        </div>
      </div>

      {/* Abas Principais: Portas & Chassi vs Ferragens & Itens vs Escrever Texto */}
      <div className="grid grid-cols-3 p-1.5 bg-slate-950/70 border-b border-slate-800 gap-1">
        <button
          onClick={() => setActiveTab('ports')}
          className={`py-1.5 px-1.5 rounded-lg font-medium text-[11px] flex items-center justify-center gap-1 transition cursor-pointer ${
            activeTab === 'ports'
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Portas</span>
        </button>

        <button
          onClick={() => setActiveTab('hardware_extras')}
          className={`py-1.5 px-1.5 rounded-lg font-medium text-[11px] flex items-center justify-center gap-1 transition cursor-pointer ${
            activeTab === 'hardware_extras'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
          }`}
        >
          <Wrench className="w-3.5 h-3.5 text-amber-400" />
          <span>Ferragens</span>
        </button>

        <button
          onClick={() => setActiveTab('text_labels')}
          className={`py-1.5 px-1.5 rounded-lg font-medium text-[11px] flex items-center justify-center gap-1 transition cursor-pointer ${
            activeTab === 'text_labels'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
          }`}
        >
          <Type className="w-3.5 h-3.5 text-emerald-400" />
          <span>Escrever</span>
        </button>
      </div>

      {/* Conteúdo com Scroll */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {activeTab === 'ports' && (
          <>
            {/* Presets Rápidos */}
            <section className="space-y-2">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Box className="w-3.5 h-3.5 text-sky-400" /> Modelos Padrões
          </label>
          <div className="grid grid-cols-1 gap-1.5">
            {/* Presets Principais em destaque */}
            <button
              onClick={() => applyChassisPreset('mikrotik_hex_s')}
              className={`py-2 px-2.5 rounded-lg text-left font-medium transition border flex items-center justify-between ${
                config.chassis.type === 'mikrotik_hex_s'
                  ? 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                  : 'bg-slate-800/60 border-slate-700/50 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div>
                <strong className="block text-white">MikroTik hEX S (2025)</strong>
                <span className="text-[10px] text-slate-400">Pequeno porte, 5x RJ45, 1x SFP, USB e DC</span>
              </div>
              <ShieldCheck className="w-4 h-4 text-sky-400 flex-shrink-0" />
            </button>

            <button
              onClick={() => applyChassisPreset('intelbras_r3005g')}
              className={`py-2 px-2.5 rounded-lg text-left font-medium transition border flex items-center justify-between ${
                config.chassis.type === 'intelbras_r3005g'
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-800/60 border-slate-700/50 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div>
                <strong className="block text-white">Intelbras R3005G (Metal Escuro)</strong>
                <span className="text-[10px] text-slate-400">Moldura rebaixada, 5x RJ45, DC Frontal 12V, USB e LEDs</span>
              </div>
              <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            </button>

            <button
              onClick={() => applyChassisPreset('cisco_modular_1u')}
              className={`py-2 px-2.5 rounded-lg text-left font-medium transition border flex items-center justify-between ${
                config.chassis.type === 'cisco_modular_1u'
                  ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                  : 'bg-slate-800/60 border-slate-700/50 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div>
                <strong className="block text-white">Cisco Modular (Slots 100G / 25G)</strong>
                <span className="text-[10px] text-slate-400">2 Slots de expansão com placas intercambiáveis</span>
              </div>
              <LayoutGrid className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-1">
            {[
              { id: 'desktop_router', label: 'Roteador Wi-Fi' },
              { id: 'rack_1u', label: 'Switch 1U Rack' },
              { id: 'rack_2u', label: 'Switch 2U Core' },
              { id: 'custom_empty', label: 'Criar do Zero' }
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => applyChassisPreset(p.id as ChassisType)}
                className={`py-1.5 px-2 rounded-lg text-left font-medium transition border text-[11px] ${
                  config.chassis.type === p.id
                    ? 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                    : 'bg-slate-800/60 border-slate-700/50 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Botão de Limpar Todos os Detalhes */}
          <div className="pt-2">
            <button
              onClick={handleClearAllDetails}
              className="w-full py-2 px-3 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-700/50 hover:border-rose-500 text-rose-300 hover:text-white rounded-lg font-medium transition flex items-center justify-center gap-2 text-xs shadow-sm cursor-pointer"
              title="Remove todas as portas, conectores, botões e LEDs para você adicionar manualmente um por um"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Remover Todos os Detalhes (Zerar)</span>
            </button>
            <span className="block text-[10px] text-slate-400 mt-1 text-center">
              Zera todas as portas para você montar o roteador peça por peça.
            </span>
          </div>
        </section>

        {/* SEÇÃO MODULAR EXCLUSIVA CISCO */}
        {isModularActive && (
          <section className="space-y-3 bg-gradient-to-br from-indigo-950/40 to-slate-950/60 p-3.5 rounded-xl border border-indigo-500/40 shadow-lg">
            <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
              <LayoutGrid className="w-4 h-4 text-indigo-400" /> Slots Modulares de Expansão
            </span>
            <p className="text-[10px] text-slate-400">
              Personalize as placas de rede encaixadas nas baias do roteador.
            </p>

            {/* Slot 1: Placa de Rede NIM */}
            <div className="space-y-1">
              <label className="text-slate-200 font-semibold flex items-center justify-between">
                <span>Slot 1 (NIM - Alta Velocidade):</span>
                <span className="text-indigo-400 text-[10px]">Baia Média</span>
              </label>
              <select
                value={config.modular?.slot1 || 'nim_1x_10g'}
                onChange={(e) => updateModular('slot1', e.target.value as ModularSlot1Type)}
                className="w-full bg-slate-800 text-slate-100 border border-indigo-500/50 rounded px-2.5 py-1.5 outline-none font-medium"
              >
                <option value="nim_1x_10g">C-NIM-1X (1x 10G SFP+ com grelha - Sketchfab)</option>
                <option value="qsfp_100g">1x Porta 100G QSFP28</option>
                <option value="dual_qsfp">2x Portas 40G/100G QSFP</option>
                <option value="dual_sfp28">2x Portas 25G SFP28</option>
                <option value="blank">Tampa Cega (Blanking Plate com parafusos)</option>
              </select>
            </div>

            {/* Slot 2: Placa de Expansão SM-X */}
            <div className="space-y-1 pt-1">
              <label className="text-slate-200 font-semibold flex items-center justify-between">
                <span>Slot 2 (SM-X - Expansão Larga):</span>
                <span className="text-indigo-400 text-[10px]">Baia Larga</span>
              </label>
              <select
                value={config.modular?.slot2 || 'sm_x_20rj_2sfp'}
                onChange={(e) => updateModular('slot2', e.target.value as ModularSlot2Type)}
                className="w-full bg-slate-800 text-slate-100 border border-indigo-500/50 rounded px-2.5 py-1.5 outline-none font-medium"
              >
                <option value="sm_x_20rj_2sfp">SM-X-E2-20UXF (20x Portas RJ45 + 2x SFP+ 10G - Sketchfab)</option>
                <option value="rj45_8p">8x Portas Gigabit RJ45 (Switch)</option>
                <option value="sfp_plus_4p">4x Portas 10G SFP+</option>
                <option value="sfp28_4p">4x Portas 25G SFP28</option>
                <option value="combo_4rj_2sfp">Híbrido: 4x RJ45 1G + 2x SFP+ 10G</option>
                <option value="blank">Tampa Cega Larga (Blanking Plate)</option>
              </select>
            </div>
          </section>
        )}

        {/* Dimensões do Chassi */}
        <section className="space-y-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-sky-400" /> Dimensões do Equipamento (cm)
          </span>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Largura (W):</span>
              <span className="text-sky-400 font-mono font-bold">{config.chassis.width} cm</span>
            </div>
            <input
              type="range"
              min={12}
              max={48}
              step={1}
              value={config.chassis.width}
              onChange={(e) => updateChassis('width', parseFloat(e.target.value))}
              className="w-full accent-sky-400"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Altura (H):</span>
              <span className="text-sky-400 font-mono font-bold">{config.chassis.height} cm</span>
            </div>
            <input
              type="range"
              min={2.5}
              max={12}
              step={0.5}
              value={config.chassis.height}
              onChange={(e) => updateChassis('height', parseFloat(e.target.value))}
              className="w-full accent-sky-400"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Profundidade (D):</span>
              <span className="text-sky-400 font-mono font-bold">{config.chassis.depth} cm</span>
            </div>
            <input
              type="range"
              min={8}
              max={35}
              step={1}
              value={config.chassis.depth}
              onChange={(e) => updateChassis('depth', parseFloat(e.target.value))}
              className="w-full accent-sky-400"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-300">Orelhas de Rack 19":</span>
            <input
              type="checkbox"
              checked={config.chassis.hasRackEars}
              onChange={(e) => updateChassis('hasRackEars', e.target.checked)}
              className="rounded accent-sky-500 w-4 h-4 cursor-pointer"
            />
          </div>
        </section>

        {/* Modelagem do Chassi e Detalhes Estruturais */}
        <section className="space-y-3 bg-gradient-to-br from-slate-900 to-slate-950 p-3 rounded-xl border border-slate-700/80 shadow-md">
          <span className="text-[11px] font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
            <Box className="w-3.5 h-3.5 text-sky-400" /> Modelagem & Detalhes do Chassi
          </span>

          {/* Estilo da Moldura Frontal */}
          <div className="space-y-1">
            <label className="text-slate-300 text-xs font-semibold">Moldura do Painel Frontal:</label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'flat', label: 'Reto Plano', desc: 'Chassi contínuo' },
                { id: 'recessed', label: 'Moldura Rebaixada', desc: 'Frente afundada' },
                { id: 'chamfered', label: 'Borda Chanfrada', desc: 'Bisel industrial' },
                { id: 'beveled', label: 'Arredondado', desc: 'Borda suave' }
              ].map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => updateChassis('bezelStyle', b.id)}
                  className={`py-1.5 px-2 rounded-lg text-left transition border cursor-pointer ${
                    (config.chassis.bezelStyle || 'flat') === b.id
                      ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="font-bold text-xs">{b.label}</div>
                  <div className="text-[9px] text-slate-400">{b.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {(config.chassis.bezelStyle === 'recessed' || config.chassis.bezelStyle === 'chamfered') && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-300">Profundidade:</span>
                  <span className="text-sky-400 font-mono font-bold">
                    {config.chassis.bezelDepth ?? 0.28} cm
                  </span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={0.8}
                  step={0.05}
                  value={config.chassis.bezelDepth ?? 0.28}
                  onChange={(e) => updateChassis('bezelDepth', parseFloat(e.target.value))}
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-300">Borda (Moldura):</span>
                  <span className="text-sky-400 font-mono font-bold">
                    {config.chassis.bezelThickness ?? 0.22} cm
                  </span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={0.6}
                  step={0.02}
                  value={config.chassis.bezelThickness ?? 0.22}
                  onChange={(e) => updateChassis('bezelThickness', parseFloat(e.target.value))}
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Fendas Laterais Estampadas (Louvers) */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800">
            <div>
              <span className="text-slate-200 text-xs font-semibold block">Fendas de Ventilação Laterais:</span>
              <span className="text-[10px] text-slate-400">Grelhas industriais estampadas na chapa</span>
            </div>
            <input
              type="checkbox"
              checked={config.chassis.sideLouvers ?? false}
              onChange={(e) => updateChassis('sideLouvers', e.target.checked)}
              className="rounded accent-sky-500 w-4 h-4 cursor-pointer"
            />
          </div>
        </section>

        {/* Posicionamento Manual dos Elementos (Offsets) */}
        <section className="space-y-3 bg-gradient-to-br from-amber-950/20 to-slate-950/60 p-3 rounded-xl border border-amber-500/30">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Move className="w-3.5 h-3.5" /> Posicionamento Manual (Offsets)
            </span>
            <button
              onClick={() => onChange((prev) => ({ ...prev, offsets: {} }))}
              className="text-[10px] text-amber-400/80 hover:text-amber-300 transition flex items-center gap-1 cursor-pointer"
              title="Voltar todas as peças para as posições automáticas padrão"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Resetar</span>
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-slate-300">Escolha o elemento para mover:</label>
            <select
              value={selectedOffsetPiece}
              onChange={(e) => setSelectedOffsetPiece(e.target.value as ElementId)}
              className="w-full bg-slate-800 text-slate-100 border border-slate-700 rounded px-2.5 py-1.5 outline-none font-medium text-xs cursor-pointer"
            >
              <option value="rj45">Portas Ethernet RJ45</option>
              <option value="optical">Portas Ópticas (SFP / QSFP)</option>
              <option value="power">Conector de Fonte Padrão</option>
              <option value="power_switch">Chave Liga/Desliga</option>
              <option value="psu_module">Módulo de Fonte Hot-Swap 1</option>
              <option value="psu_module_2">Módulo de Fonte Hot-Swap 2</option>
              <option value="perforated_grill">Ferragem com Furos de Respiro</option>
              <option value="fan_tray">Gaveta de Coolers (Fan Tray)</option>
              <option value="rack_handles">Alças Metálicas Frontais</option>
              <option value="grounding_lug">Ponto de Aterramento Duplo</option>
              <option value="usb">Porta USB 3.0</option>
              <option value="console">Porta Console RJ45</option>
              <option value="leds">LEDs de Status / Painel Frontal</option>
              {config.modular?.enabled && (
                <>
                  <option value="slot1">Slot Modular 1 (NIM)</option>
                  <option value="slot2">Slot Modular 2 (SM-X)</option>
                </>
              )}
            </select>
          </div>

          {/* Deslocamento X */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 text-[11px]">Eixo X (Horizontal):</span>
              <span className="text-amber-400 font-mono font-bold">
                {(config.offsets?.[selectedOffsetPiece]?.x ?? 0) > 0 ? `+${config.offsets?.[selectedOffsetPiece]?.x}` : (config.offsets?.[selectedOffsetPiece]?.x ?? 0)} cm
              </span>
            </div>
            <input
              type="range"
              min={-maxRangeX}
              max={maxRangeX}
              step={0.1}
              value={config.offsets?.[selectedOffsetPiece]?.x ?? 0}
              onChange={(e) => updateOffset(selectedOffsetPiece, 'x', parseFloat(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>

          {/* Deslocamento Y */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 text-[11px]">Eixo Y (Vertical):</span>
              <span className="text-amber-400 font-mono font-bold">
                {(config.offsets?.[selectedOffsetPiece]?.y ?? 0) > 0 ? `+${config.offsets?.[selectedOffsetPiece]?.y}` : (config.offsets?.[selectedOffsetPiece]?.y ?? 0)} cm
              </span>
            </div>
            <input
              type="range"
              min={-maxRangeY}
              max={maxRangeY}
              step={0.1}
              value={config.offsets?.[selectedOffsetPiece]?.y ?? 0}
              onChange={(e) => updateOffset(selectedOffsetPiece, 'y', parseFloat(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>

          {/* Escala / Tamanho da Peça */}
          <div className="space-y-1 pt-1 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 text-[11px]">Tamanho / Escala:</span>
              <span className="text-emerald-400 font-mono font-bold">
                {(config.offsets?.[selectedOffsetPiece]?.scale ?? 1.0).toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min={0.2}
              max={3.0}
              step={0.05}
              value={config.offsets?.[selectedOffsetPiece]?.scale ?? 1.0}
              onChange={(e) => {
                const sc = parseFloat(e.target.value);
                onChange((prev) => ({
                  ...prev,
                  offsets: {
                    ...prev.offsets,
                    [selectedOffsetPiece]: {
                      ...(prev.offsets?.[selectedOffsetPiece] || { x: 0, y: 0, z: 0 }),
                      scale: sc
                    }
                  }
                }));
              }}
              className="w-full accent-emerald-400 cursor-pointer"
            />
          </div>

          {/* Botão de Apagar Peça Selecionada na Sidebar */}
          <div className="pt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onChange((prev) => ({
                  ...prev,
                  offsets: {
                    ...prev.offsets,
                    [selectedOffsetPiece]: {
                      ...(prev.offsets?.[selectedOffsetPiece] || { x: 0, y: 0, z: 0 }),
                      hidden: true
                    }
                  }
                }));
              }}
              className="w-full py-1.5 px-2 bg-rose-950/60 hover:bg-rose-900 border border-rose-600/50 hover:border-rose-500 text-rose-300 hover:text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Ocultar / Apagar Peça</span>
            </button>
          </div>

          {/* Restaurar Peças Ocultadas */}
          {Object.entries(config.offsets || {}).some(([_, val]) => val?.hidden) && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  onChange((prev) => {
                    const nextOffsets = { ...prev.offsets };
                    Object.keys(nextOffsets).forEach((key) => {
                      if (nextOffsets[key]?.hidden) {
                        nextOffsets[key] = { ...nextOffsets[key]!, hidden: false };
                      }
                    });
                    return { ...prev, offsets: nextOffsets };
                  });
                }}
                className="w-full py-1 px-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 rounded text-[10px] font-medium transition cursor-pointer flex items-center justify-center gap-1 border border-slate-700"
              >
                <RotateCcw className="w-3 h-3 text-emerald-400" />
                <span>Restaurar Peças Apagadas</span>
              </button>
            </div>
          )}

          <span className="block text-[10px] text-slate-400 text-center">
            💡 Ou use o botão <strong>"Mover Peças (M)"</strong> no topo do 3D para arrastar direto no modelo!
          </span>
        </section>

        {/* Portas Ethernet RJ45 Fixas */}
        {!isModularActive && (
          <section className="space-y-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" /> Portas RJ45 (com LEDs Rx/Tx)
            </span>

            <div className="space-y-1">
              <label className="text-slate-300 flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-sky-400" /> Posição das Portas:
              </label>
              <select
                value={config.ports.panelPosition || 'auto'}
                onChange={(e) => updatePorts('panelPosition', e.target.value as PortPanelPosition)}
                className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded px-2.5 py-1.5 outline-none font-medium"
              >
                <option value="auto">Automático (Rack: Frente | Roteador: Traseira)</option>
                <option value="front">Painel Frontal</option>
                <option value="rear">Painel Traseiro</option>
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Portas LAN:</span>
                <span className="text-amber-400 font-mono font-bold">{config.ports.rj45LanCount}</span>
              </div>
              <input
                type="range"
                min={0}
                max={48}
                step={1}
                value={config.ports.rj45LanCount}
                onChange={(e) => updatePorts('rj45LanCount', parseInt(e.target.value, 10))}
                className="w-full accent-amber-400"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Portas WAN (Azuis):</span>
                <span className="text-sky-400 font-mono font-bold">{config.ports.rj45WanCount}</span>
              </div>
              <input
                type="range"
                min={0}
                max={4}
                step={1}
                value={config.ports.rj45WanCount}
                onChange={(e) => updatePorts('rj45WanCount', parseInt(e.target.value, 10))}
                className="w-full accent-sky-400"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-300">Disposição:</span>
              <select
                value={config.ports.rj45Arrangement}
                onChange={(e) => updatePorts('rj45Arrangement', e.target.value as RJ45Arrangement)}
                className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-2 py-1 outline-none"
              >
                <option value="single_row">Fileira Única (1xN)</option>
                <option value="double_row">Fileira Dupla (2xN)</option>
              </select>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-300">Porta Console (RJ45 Azul):</span>
              <input
                type="checkbox"
                checked={config.ports.hasConsolePort}
                onChange={(e) => updatePorts('hasConsolePort', e.target.checked)}
                className="rounded accent-sky-400 w-4 h-4 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-300">Porta USB 3.0:</span>
              <input
                type="checkbox"
                checked={config.ports.usbPortCount > 0}
                onChange={(e) => updatePorts('usbPortCount', e.target.checked ? 1 : 0)}
                className="rounded accent-sky-400 w-4 h-4 cursor-pointer"
              />
            </div>
          </section>
        )}

        {/* Portas Ópticas Fixas */}
        {!isModularActive && (
          <section className="space-y-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-purple-400" /> Portas Ópticas Fixas
            </span>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span>SFP (1G):</span>
                  <span className="text-emerald-400 font-bold">{config.ports.sfpCount}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={8}
                  value={config.ports.sfpCount}
                  onChange={(e) => updatePorts('sfpCount', parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-400"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span>SFP+ (10G):</span>
                  <span className="text-sky-400 font-bold">{config.ports.sfpPlusCount}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={8}
                  value={config.ports.sfpPlusCount}
                  onChange={(e) => updatePorts('sfpPlusCount', parseInt(e.target.value, 10))}
                  className="w-full accent-sky-400"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span>SFP28 (25G):</span>
                  <span className="text-cyan-400 font-bold">{config.ports.sfp28Count}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={8}
                  value={config.ports.sfp28Count}
                  onChange={(e) => updatePorts('sfp28Count', parseInt(e.target.value, 10))}
                  className="w-full accent-cyan-400"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span>QSFP (100G):</span>
                  <span className="text-purple-400 font-bold">{config.ports.qsfpCount}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={4}
                  value={config.ports.qsfpCount}
                  onChange={(e) => updatePorts('qsfpCount', parseInt(e.target.value, 10))}
                  className="w-full accent-purple-400"
                />
              </div>
            </div>
          </section>
        )}

        {/* Painel Frontal, LEDs e Botões */}
        <section className="space-y-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400" /> Painel Frontal, LEDs & Botões
          </span>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">LEDs de Status:</span>
              <span className="text-emerald-400 font-mono font-bold">{config.frontPanel.ledCount}</span>
            </div>
            <input
              type="range"
              min={0}
              max={8}
              step={1}
              value={config.frontPanel.ledCount}
              onChange={(e) => updateFrontPanel('ledCount', parseInt(e.target.value, 10))}
              className="w-full accent-emerald-400"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-300">LEDs Acesos (Luz/Tráfego):</span>
            <input
              type="checkbox"
              checked={config.frontPanel.ledStatus}
              onChange={(e) => updateFrontPanel('ledStatus', e.target.checked)}
              className="rounded accent-emerald-400 w-4 h-4 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-300">Furo de Reset:</span>
            <input
              type="checkbox"
              checked={config.frontPanel.hasResetHole}
              onChange={(e) => updateFrontPanel('hasResetHole', e.target.checked)}
              className="rounded accent-emerald-400 w-4 h-4 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-300">Botão WPS:</span>
            <input
              type="checkbox"
              checked={config.frontPanel.hasWpsButton}
              onChange={(e) => updateFrontPanel('hasWpsButton', e.target.checked)}
              className="rounded accent-emerald-400 w-4 h-4 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-300">Display / Tela OLED:</span>
            <input
              type="checkbox"
              checked={config.frontPanel.hasOledScreen}
              onChange={(e) => updateFrontPanel('hasOledScreen', e.target.checked)}
              className="rounded accent-emerald-400 w-4 h-4 cursor-pointer"
            />
          </div>
        </section>

        {/* Alimentação / Fonte */}
        <section className="space-y-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" /> Fonte de Alimentação
          </span>

          <div className="space-y-1.5">
            <label className="text-slate-300">Tipo de Conector:</label>
            <select
              value={config.power.type}
              onChange={(e) => updatePower('type', e.target.value as PowerSupplyType)}
              className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded px-2.5 py-1.5 outline-none font-medium"
            >
              <option value="hot_swap_psu">Fonte Hot-Swap Completa (Cooler + Alça + Trava)</option>
              <option value="dual_hot_swap_psu">2x Fontes Hot-Swap Redundantes (1+1)</option>
              <option value="dc_barrel">DC Redondo (Notebook/Roteador 12V)</option>
              <option value="iec_c14">IEC C14 (3 pinos de PC / Servidor)</option>
              <option value="dual_iec_c14">2x IEC C14 (Fonte Redundante)</option>
              <option value="dual_dc_barrel">2x DC Redondo (Fonte Redundante)</option>
              <option value="none">Sem conector visível</option>
            </select>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-300">Chave Liga/Desliga no Chassi:</span>
            <input
              type="checkbox"
              checked={config.power.hasPowerSwitch}
              onChange={(e) => updatePower('hasPowerSwitch', e.target.checked)}
              className="rounded accent-sky-400 w-4 h-4 cursor-pointer"
            />
          </div>
          {config.power.hasPowerSwitch && (
            <div className="text-[10px] text-sky-400/90 pt-0.5">
              💡 Item móvel opcional: arraste a chave livremente no 3D com a tecla <strong>M</strong>!
            </div>
          )}
        </section>

        {/* Antenas Wi-Fi */}
        <section className="space-y-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Wifi className="w-3.5 h-3.5 text-sky-400" /> Antenas Wi-Fi
          </span>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Quantidade:</span>
              <span className="text-sky-400 font-bold">{config.antennas.count}</span>
            </div>
            <input
              type="range"
              min={0}
              max={8}
              value={config.antennas.count}
              onChange={(e) => updateAntennas('count', parseInt(e.target.value, 10))}
              className="w-full accent-sky-400"
            />
          </div>

          {config.antennas.count > 0 && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Altura:</span>
                  <span className="text-slate-400">{config.antennas.height} cm</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={18}
                  value={config.antennas.height}
                  onChange={(e) => updateAntennas('height', parseFloat(e.target.value))}
                  className="w-full accent-sky-400"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Ângulo / Abertura:</span>
                  <span className="text-slate-400">{config.antennas.angle}°</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={45}
                  value={config.antennas.angle}
                  onChange={(e) => updateAntennas('angle', parseInt(e.target.value, 10))}
                  className="w-full accent-sky-400"
                />
              </div>
            </>
          )}
        </section>
          </>
        )}

        {/* ABA: FERRAGENS & ITENS ESPECIAIS */}
        {activeTab === 'hardware_extras' && (
          <div className="space-y-4">
            {/* 1. MÓDULO COMPLETO DE FONTE HOT-SWAP (IMAGEM 2) */}
            <section className="space-y-3 bg-gradient-to-br from-amber-950/30 to-slate-950/60 p-3.5 rounded-xl border border-amber-500/40 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400" /> Fonte Hot-Swap Completa
                </span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-medium">
                  1:1 Fiel
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Módulo de fonte industrial completo com ventoinha de exaustão, 4 parafusos de fixação, alça metálica de extração, trava de liberação rápida e conector IEC C14.
              </p>

              <div className="space-y-1.5">
                <label className="text-slate-200 font-semibold text-[11px]">Tipo de Fonte:</label>
                <select
                  value={config.power.type}
                  onChange={(e) => updatePower('type', e.target.value as PowerSupplyType)}
                  className="w-full bg-slate-800 text-slate-100 border border-amber-500/50 rounded px-2.5 py-1.5 outline-none font-medium text-xs cursor-pointer"
                >
                  <option value="hot_swap_psu">1x Fonte Hot-Swap Completa (Cooler + Alça + Trava)</option>
                  <option value="dual_hot_swap_psu">2x Fontes Hot-Swap Redundantes (1+1)</option>
                  <option value="iec_c14">Conector Padrão IEC C14 (PC/Servidor)</option>
                  <option value="dual_iec_c14">2x Conectores IEC C14 (Redundante)</option>
                  <option value="dc_barrel">Plugue DC Redondo (12V)</option>
                  <option value="dual_dc_barrel">2x DC Redondo (Redundante)</option>
                  <option value="none">Sem Fonte Visível</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-300">Chave Liga/Desliga no Chassi:</span>
                <input
                  type="checkbox"
                  checked={config.power.hasPowerSwitch}
                  onChange={(e) => updatePower('hasPowerSwitch', e.target.checked)}
                  className="rounded accent-amber-400 w-4 h-4 cursor-pointer"
                />
              </div>
              {config.power.hasPowerSwitch && (
                <div className="text-[10px] text-amber-300/90 pt-0.5">
                  💡 Item móvel opcional: arraste a chave livremente no 3D com a tecla <strong>M</strong>!
                </div>
              )}

              {(config.power.type === 'hot_swap_psu' || config.power.type === 'dual_hot_swap_psu') && (
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-[10px] space-y-1 text-slate-300">
                  <div className="flex items-center gap-1.5 text-amber-300 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Componentes da Fonte Ativos:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-400 pl-1">
                    <li>Cooler com grelha de micro-furos & 4 parafusos de retenção</li>
                    <li>Alça metálica cromada para puxar e extrair o módulo</li>
                    <li>Alavanca de trava com aba de extração rápida</li>
                    <li>Tomada de 3 pinos IEC C14 e LEDs indicadores (AC OK / Fault)</li>
                  </ul>
                </div>
              )}
            </section>

            {/* 2. FERRAGEM COM FUROS PARA RESPIRO (IMAGEM 1) */}
            <section className="space-y-3 bg-gradient-to-br from-sky-950/30 to-slate-950/60 p-3.5 rounded-xl border border-sky-500/40 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Wind className="w-4 h-4 text-sky-400" /> Grelha de Ventilação / Respiro
                </span>
                <input
                  type="checkbox"
                  checked={config.accessories?.perforatedGrill ?? false}
                  onChange={(e) => updateAccessories('perforatedGrill', e.target.checked)}
                  className="rounded accent-sky-400 w-4 h-4 cursor-pointer"
                />
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Placa metálica com matriz de micro-furos de respiro estilo favo de mel (honeycomb), moldura chanfrada e parafusos de fixação.
              </p>

              {config.accessories?.perforatedGrill && (
                <div className="space-y-2.5 pt-1">
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-300">
                      <span>Largura da Placa:</span>
                      <span className="text-sky-400 font-mono font-bold">
                        {config.accessories?.grillWidth ?? 10} cm
                      </span>
                    </div>
                    <input
                      type="range"
                      min={4}
                      max={24}
                      step={0.5}
                      value={config.accessories?.grillWidth ?? 10}
                      onChange={(e) => updateAccessories('grillWidth', parseFloat(e.target.value))}
                      className="w-full accent-sky-400 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-300 text-[11px]">Painel de Instalação:</label>
                    <select
                      value={config.accessories?.grillPosition ?? 'front'}
                      onChange={(e) => updateAccessories('grillPosition', e.target.value as 'front' | 'rear')}
                      className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded px-2.5 py-1.5 outline-none font-medium text-xs cursor-pointer"
                    >
                      <option value="front">Painel Frontal (lado das portas/slots)</option>
                      <option value="rear">Painel Traseiro (lado das fontes/exaustão)</option>
                    </select>
                  </div>
                </div>
              )}
            </section>

            {/* 3. GAVETA DE COOLERS MODULAR (FAN TRAY) */}
            <section className="space-y-3 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Fan className="w-4 h-4 text-cyan-400" /> Gaveta de Coolers (Fan Tray)
                </span>
                <span className="text-cyan-400 font-mono font-bold">
                  {config.accessories?.fanTrayCount ?? 0} {((config.accessories?.fanTrayCount ?? 0) === 1 ? 'cooler' : 'coolers')}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Módulo removível traseiro com ventoinhas axiais de alta vazão para refrigeração forçada.
              </p>

              <div className="space-y-1">
                <input
                  type="range"
                  min={0}
                  max={3}
                  step={1}
                  value={config.accessories?.fanTrayCount ?? 0}
                  onChange={(e) => updateAccessories('fanTrayCount', parseInt(e.target.value, 10))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>0 (Sem coolers)</span>
                  <span>1 Cooler</span>
                  <span>2 Coolers</span>
                  <span>3 Coolers</span>
                </div>
              </div>
            </section>

            {/* 4. ALÇAS METÁLICAS FRONTAIS DE RACK */}
            <section className="space-y-2 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800 shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Box className="w-4 h-4 text-slate-300" /> Alças Frontais de Rack 19"
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Alças tubulares de aço cromado para manuseio e fixação
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={config.accessories?.hasRackHandles ?? false}
                  onChange={(e) => updateAccessories('hasRackHandles', e.target.checked)}
                  className="rounded accent-sky-400 w-4 h-4 cursor-pointer"
                />
              </div>
            </section>

            {/* 5. PONTO DUPLO DE ATERRAMENTO (GROUND LUG) */}
            <section className="space-y-2 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800 shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" /> Aterramento Duplo (Ground Lug)
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Dois parafusos sextavados de latão para proteção ESD
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={config.accessories?.hasGroundingLug ?? false}
                  onChange={(e) => updateAccessories('hasGroundingLug', e.target.checked)}
                  className="rounded accent-emerald-400 w-4 h-4 cursor-pointer"
                />
              </div>
            </section>

            {/* 6. POSICIONAMENTO E CONTROLES DE DESLOCAMENTO DAS FERRAGENS */}
            <section className="space-y-3 bg-gradient-to-br from-amber-950/20 to-slate-950/60 p-3.5 rounded-xl border border-amber-500/30">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Move className="w-3.5 h-3.5" /> Posicionamento das Ferragens
                </span>
                <button
                  onClick={() => onChange((prev) => ({ ...prev, offsets: {} }))}
                  className="text-[10px] text-amber-400/80 hover:text-amber-300 transition flex items-center gap-1 cursor-pointer"
                  title="Voltar todas as peças para as posições automáticas padrão"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Resetar</span>
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300">Escolha o item para mover:</label>
                <select
                  value={selectedOffsetPiece}
                  onChange={(e) => setSelectedOffsetPiece(e.target.value as ElementId)}
                  className="w-full bg-slate-800 text-slate-100 border border-slate-700 rounded px-2.5 py-1.5 outline-none font-medium text-xs cursor-pointer"
                >
                  <option value="perforated_grill">Ferragem com Furos de Respiro</option>
                  <option value="psu_module">Módulo de Fonte Hot-Swap 1</option>
                  <option value="psu_module_2">Módulo de Fonte Hot-Swap 2</option>
                  <option value="fan_tray">Gaveta de Coolers (Fan Tray)</option>
                  <option value="rack_handles">Alças Metálicas Frontais</option>
                  <option value="grounding_lug">Ponto de Aterramento Duplo</option>
                  <option value="power">Conector de Fonte Padrão</option>
                  <option value="power_switch">Chave Liga/Desliga</option>
                  <option value="rj45">Portas Ethernet RJ45</option>
                  <option value="optical">Portas Ópticas (SFP / QSFP)</option>
                  <option value="usb">Porta USB 3.0</option>
                  <option value="console">Porta Console RJ45</option>
                  <option value="leds">LEDs de Status</option>
                </select>
              </div>

              {/* Deslocamento X */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 text-[11px]">Eixo X (Horizontal):</span>
                  <span className="text-amber-400 font-mono font-bold">
                    {(config.offsets?.[selectedOffsetPiece]?.x ?? 0) > 0 ? `+${config.offsets?.[selectedOffsetPiece]?.x}` : (config.offsets?.[selectedOffsetPiece]?.x ?? 0)} cm
                  </span>
                </div>
                <input
                  type="range"
                  min={-maxRangeX}
                  max={maxRangeX}
                  step={0.1}
                  value={config.offsets?.[selectedOffsetPiece]?.x ?? 0}
                  onChange={(e) => updateOffset(selectedOffsetPiece, 'x', parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              {/* Deslocamento Y */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 text-[11px]">Eixo Y (Vertical):</span>
                  <span className="text-amber-400 font-mono font-bold">
                    {(config.offsets?.[selectedOffsetPiece]?.y ?? 0) > 0 ? `+${config.offsets?.[selectedOffsetPiece]?.y}` : (config.offsets?.[selectedOffsetPiece]?.y ?? 0)} cm
                  </span>
                </div>
                <input
                  type="range"
                  min={-maxRangeY}
                  max={maxRangeY}
                  step={0.1}
                  value={config.offsets?.[selectedOffsetPiece]?.y ?? 0}
                  onChange={(e) => updateOffset(selectedOffsetPiece, 'y', parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              <div className="p-2 bg-slate-900/80 rounded border border-amber-500/20 text-[10px] text-amber-200/90 leading-tight">
                💡 Pressione a tecla <strong>M</strong> para ativar o Gizmo 3D e arrastar os itens diretamente com o mouse na viewport!
              </div>
            </section>
          </div>
        )}

        {/* ABA: ESCREVER TEXTOS & ETIQUETAS 3D */}
        {activeTab === 'text_labels' && (
          <div className="space-y-4">
            {/* Apresentação & Ação de Mira Direta 3D */}
            <div className="p-3 bg-gradient-to-br from-emerald-950/70 via-slate-900 to-slate-950 rounded-xl border border-emerald-500/40 space-y-2.5 shadow-lg shadow-emerald-950/30">
              <div className="flex items-start gap-2.5">
                <span className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0">
                  <Type className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="font-bold text-slate-100 text-xs">Escrever no Roteador 3D</h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed mt-0.5">
                    Escreva serigrafias, plaquetas e advertências diretamente na carcaça do equipamento.
                  </p>
                </div>
              </div>

              {/* Botão de Destaque: Clicar no Roteador */}
              <button
                onClick={() => onEnterWriteMode?.()}
                className="w-full py-2 px-3 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold rounded-lg flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-emerald-500/30 text-xs"
                title="Ativa a mira para você clicar em qualquer ponto da carcaça 3D e digitar a frase"
              >
                <Crosshair className="w-4 h-4" />
                <span>🎯 Clicar no Roteador para Escrever</span>
              </button>
            </div>

            {/* Formulário de Criação de Texto */}
            <section className="space-y-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
              <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-400" /> Nova Inscrição de Texto
              </label>

              {/* Input de Texto */}
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400">Texto a Escrever:</span>
                <input
                  type="text"
                  value={labelInputText}
                  onChange={(e) => setLabelInputText(e.target.value)}
                  placeholder="Ex: CISCO, CONSOLE, 10GbE, WAN..."
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-emerald-400 font-mono"
                />
              </div>

              {/* Chips Rápidos de Exemplo */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500">Sugestões rápidas de rede:</span>
                <div className="flex flex-wrap gap-1">
                  {[
                    'CISCO',
                    'CONSOLE',
                    'MGMT',
                    'GigabitEthernet',
                    'WAN',
                    'LAN 1-4',
                    '10GbE SFP+',
                    'RESET',
                    '100-240V AC',
                    'MikroTik',
                    'PoE+ 30W',
                    'SERIAL NO.'
                  ].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setLabelInputText(preset)}
                      className="px-2 py-0.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-emerald-300 rounded text-[10px] transition cursor-pointer border border-slate-700/50"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Estilo Visual */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] text-slate-400">Estilo da Inscrição:</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setLabelStyle('silkscreen')}
                    className={`p-2 rounded-lg text-[11px] text-left transition cursor-pointer border ${
                      labelStyle === 'silkscreen'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-slate-200">Serigrafia Direta</div>
                    <div className="text-[9px] text-slate-400">Tinta nítida no metal</div>
                  </button>

                  <button
                    onClick={() => setLabelStyle('badge')}
                    className={`p-2 rounded-lg text-[11px] text-left transition cursor-pointer border ${
                      labelStyle === 'badge'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-slate-200">Plaqueta Anodizada</div>
                    <div className="text-[9px] text-slate-400">Micro-rebites nos cantos</div>
                  </button>

                  <button
                    onClick={() => setLabelStyle('metallic')}
                    className={`p-2 rounded-lg text-[11px] text-left transition cursor-pointer border ${
                      labelStyle === 'metallic'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-slate-200">Alumínio Escovado</div>
                    <div className="text-[9px] text-slate-400">Placa prateada gravada</div>
                  </button>

                  <button
                    onClick={() => setLabelStyle('tape_warning')}
                    className={`p-2 rounded-lg text-[11px] text-left transition cursor-pointer border ${
                      labelStyle === 'tape_warning'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-slate-200">Fita de Aviso</div>
                    <div className="text-[9px] text-slate-400">Amarela com listras pretas</div>
                  </button>
                </div>
              </div>

              {/* Cor do Texto e Face Inicial */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400">Cor do Texto:</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={labelTextColor}
                      onChange={(e) => setLabelTextColor(e.target.value)}
                      className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent"
                    />
                    <div className="flex gap-1">
                      {['#ffffff', '#38bdf8', '#eab308', '#22c55e', '#ef4444', '#000000'].map((c) => (
                        <button
                          key={c}
                          onClick={() => setLabelTextColor(c)}
                          style={{ backgroundColor: c }}
                          className="w-3.5 h-3.5 rounded-full border border-slate-700 cursor-pointer"
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400">Face Inicial:</span>
                  <select
                    value={labelFace}
                    onChange={(e) => setLabelFace(e.target.value as ChassisFace)}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs cursor-pointer"
                  >
                    <option value="front">Frente (+Z)</option>
                    <option value="rear">Traseira (-Z)</option>
                    <option value="top">Topo (+Y)</option>
                    <option value="bottom">Base (-Y)</option>
                    <option value="left">Lateral Esq. (-X)</option>
                    <option value="right">Lateral Dir. (+X)</option>
                  </select>
                </div>
              </div>

              {/* Tamanho da Fonte */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between items-center text-[11px] text-slate-400">
                  <span>Tamanho da Fonte:</span>
                  <span className="font-mono text-emerald-400 font-bold">{labelFontSize} px</span>
                </div>
                <input
                  type="range"
                  min={32}
                  max={72}
                  step={4}
                  value={labelFontSize}
                  onChange={(e) => setLabelFontSize(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>

              {/* Botão de Inserção */}
              <button
                onClick={handleAddTextLabel}
                className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shadow-lg shadow-emerald-950/40 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Texto ao Roteador</span>
              </button>
            </section>

            {/* Lista de Textos Já Adicionados */}
            <section className="space-y-2 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Textos no Roteador ({config.labels?.length || 0})
                </label>
              </div>

              {!config.labels || config.labels.length === 0 ? (
                <div className="py-4 text-center text-slate-500 text-xs italic">
                  Nenhum texto adicionado ainda. Preencha acima e clique em "Adicionar Texto ao Roteador" ou em "Clicar no Roteador"!
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {config.labels.map((item) => {
                    const isSelected = selectedElementId === `label_${item.id}`;
                    return (
                      <div
                        key={item.id}
                        onClick={() => onSelectElement?.(`label_${item.id}`)}
                        className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 transition cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-950/60 border-emerald-500 shadow-md shadow-emerald-950/40 ring-1 ring-emerald-500/50'
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                        }`}
                        title="Clique para selecionar e mover este texto"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span
                            className={`p-1 rounded ${
                              isSelected ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            <Type className="w-3.5 h-3.5" />
                          </span>
                          <div className="truncate">
                            <div className="font-bold text-slate-100 text-xs truncate font-mono">
                              "{item.text}"
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span className="capitalize">{item.style}</span>
                              <span>•</span>
                              <span className="capitalize">{item.face || 'front'}</span>
                              {isSelected && (
                                <span className="text-emerald-400 font-semibold">• Selecionado</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleRemoveTextLabel(item.id)}
                            className="p-1 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded transition cursor-pointer"
                            title="Excluir Texto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="p-2.5 bg-slate-900/90 rounded-lg border border-emerald-500/30 text-[11px] text-emerald-200/90 leading-relaxed space-y-1">
                <div className="font-semibold text-emerald-300 flex items-center gap-1">
                  <span>💡</span> Como Mover seu Texto:
                </div>
                <div>
                  • <strong>Arraste Direto</strong>: Clique no texto com o botão esquerdo e arraste o mouse pela carcaça.
                </div>
                <div>
                  • <strong>Gizmo 3D</strong>: Use as setas vermelha (X), verde (Y) e azul (Z) para ajuste fino.
                </div>
                <div>
                  • <strong>Fixação nas Faces</strong>: No painel flutuante inferior, clique em Frente, Traseira, Topo, Base ou Laterais para mudar de face instantaneamente!
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};
