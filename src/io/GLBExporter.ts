import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { RouterConfig } from '../types/router';
import { TextureManager } from '../painter/TextureManager';

export async function exportToGLB(model: THREE.Group, filename: string = 'router-model.glb') {
  const exporter = new GLTFExporter();

  // 1. Clona o modelo para exportação sem alterar a visualização ativa da tela
  const exportScene = model.clone(true);

  // 2. Conversão de escala para Unreal Engine 5.4:
  // No padrão glTF/GLB, 1 unidade = 1 metro. A UE 5.4 importa 1 metro como 100 cm (100 unidades da Unreal).
  // No Crafter, o chassi foi modelado em valores de centímetros (ex: 14 cm, 44 cm, 20.9 cm).
  // Multiplicamos por 0.01 em todos os eixos para converter cm -> metros, garantindo tamanho real 1:1 na Unreal.
  exportScene.scale.set(0.01, 0.01, 0.01);
  exportScene.updateMatrixWorld(true);

  const gltf = await exporter.parseAsync(exportScene, {
    binary: true,
    onlyVisible: true,
    includeCustomExtensions: true
  });
  const blob = new Blob([gltf as ArrayBuffer], { type: 'model/gltf-binary' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.glb') ? filename : `${filename}.glb`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportPresetJSON(config: RouterConfig, textureManager: TextureManager, filename: string = 'router-preset.json') {
  const textureDataUrl = textureManager.canvas.toDataURL('image/png');
  const payload = {
    version: '1.0',
    dimensionsCm: {
      widthCm: config.chassis.width,
      depthCm: config.chassis.depth,
      heightCm: config.chassis.height
    },
    config,
    textureDataUrl
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function importPresetJSON(
  file: File,
  onLoaded: (config: RouterConfig, textureImage: HTMLImageElement) => void
) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target?.result as string);
      if (!data.config) throw new Error('Formato de preset inválido');
      if (data.category === 'environment') throw new Error('Carregue este preset na categoria Ambientes / Casas');
      if (!data.config.chassis || !data.config.ports || !data.config.power || !data.config.antennas || !data.config.frontPanel) {
        throw new Error('O arquivo não contém uma configuração de equipamento de rede');
      }

      if (data.textureDataUrl) {
        const img = new Image();
        img.onload = () => {
          onLoaded(data.config, img);
        };
        img.src = data.textureDataUrl;
      } else {
        const dummyImg = new Image();
        onLoaded(data.config, dummyImg);
      }
    } catch (err) {
      alert('Erro ao carregar arquivo de preset: ' + err);
    }
  };
  reader.readAsText(file);
}

export function exportTexturePNG(textureManager: TextureManager, filename: string = 'router-texture.png') {
  const url = textureManager.canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
}
