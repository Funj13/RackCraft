import * as THREE from 'three';
import { RouterConfig, TextLabelConfig, TextLabelStyle, ChassisFace } from '../types/router';

/**
 * Gera textura nítida procedural em Canvas 2D para serigrafias e plaquetas de texto
 */
function createTextLabelTexture(label: TextLabelConfig): { texture: THREE.CanvasTexture; aspect: number } {
  const canvas = document.createElement('canvas');
  const text = label.text || 'LABEL';
  const style: TextLabelStyle = label.style || 'silkscreen';
  const textColor = label.textColor || (style === 'metallic' ? '#0f172a' : style === 'tape_warning' ? '#000000' : '#f8fafc');

  // Ajusta resolução do canvas com base no comprimento do texto
  const charCount = Math.max(text.length, 4);
  const canvasWidth = Math.min(1024, Math.max(384, charCount * 48));
  const canvasHeight = 128;
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  if (style === 'badge') {
    // Plaqueta preta anodizada com borda metálica e parafusos nos cantos
    ctx.fillStyle = label.bgColor || '#090d16';
    ctx.fillRect(4, 4, canvasWidth - 8, canvasHeight - 8);

    // Borda chanfrada
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, canvasWidth - 8, canvasHeight - 8);

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(8, 8, canvasWidth - 16, canvasHeight - 16);

    // Micro-rebites nos 4 cantos
    const rivet = (x: number, y: number) => {
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#64748b';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
    };
    rivet(18, 18);
    rivet(canvasWidth - 18, 18);
    rivet(18, canvasHeight - 18);
    rivet(canvasWidth - 18, canvasHeight - 18);
  } else if (style === 'metallic') {
    // Placa metálica de alumínio escovado
    const grad = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    grad.addColorStop(0, '#e2e8f0');
    grad.addColorStop(0.5, '#cbd5e1');
    grad.addColorStop(1, '#94a3b8');
    ctx.fillStyle = grad;
    ctx.fillRect(4, 4, canvasWidth - 8, canvasHeight - 8);

    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, canvasWidth - 8, canvasHeight - 8);
  } else if (style === 'tape_warning') {
    // Fita amarela de perigo com faixas diagonais pretas nas bordas
    ctx.fillStyle = '#eab308';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Faixas diagonais no topo e base
    const stripeH = 16;
    ctx.fillStyle = '#000000';
    for (let x = -stripeH; x < canvasWidth + stripeH; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 12, 0);
      ctx.lineTo(x, stripeH);
      ctx.lineTo(x - 12, stripeH);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(x, canvasHeight - stripeH);
      ctx.lineTo(x + 12, canvasHeight - stripeH);
      ctx.lineTo(x, canvasHeight);
      ctx.lineTo(x - 12, canvasHeight);
      ctx.fill();
    }
  }

  // Renderização do Texto
  const fontSize = label.fontSize || 56;
  ctx.font = `bold ${fontSize}px "SF Pro Text", "Segoe UI", system-ui, -apple-system, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Sombra suave para relevo óptico
  if (style === 'metallic') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText(text, canvasWidth / 2, canvasHeight / 2 + 2);
  } else if (style !== 'silkscreen') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillText(text, canvasWidth / 2, canvasHeight / 2 + 2);
  }

  // Texto principal
  ctx.fillStyle = textColor;
  ctx.fillText(text, canvasWidth / 2, canvasHeight / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 8;
  texture.generateMipmaps = true;

  const aspect = canvasWidth / canvasHeight;
  return { texture, aspect };
}

/**
 * Cria a malha 3D interativa de uma etiqueta/serigrafia de texto
 */
export function createTextLabelMesh(
  label: TextLabelConfig,
  chassisWidth: number,
  chassisHeight: number,
  chassisDepth: number
): THREE.Group {
  const root = new THREE.Group();
  root.name = `Element_Text_${label.id}`;

  const { texture, aspect } = createTextLabelTexture(label);
  const scale = label.scale || 1.0;
  const height = 0.9 * scale;
  const width = height * aspect;
  const depth = label.style === 'silkscreen' ? 0.02 : 0.08;

  let mesh: THREE.Mesh;
  if (label.style === 'silkscreen') {
    // Serigrafia: Plano 2D impresso diretamente sobre a superfície da carcaça
    const geo = new THREE.PlaneGeometry(width, height);
    const mat = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.02,
      roughness: 0.45,
      metalness: 0.1,
      side: THREE.DoubleSide,
      depthTest: true,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3
    });
    mesh = new THREE.Mesh(geo, mat);
  } else {
    // Plaqueta sólida 3D ('badge', 'metallic', 'tape_warning')
    const geo = new THREE.BoxGeometry(width, height, depth);
    const sideColor = label.style === 'metallic' ? 0x94a3b8 : label.style === 'tape_warning' ? 0xca8a04 : 0x0f172a;
    const sideMat = new THREE.MeshStandardMaterial({
      color: sideColor,
      roughness: 0.5,
      metalness: label.style === 'metallic' ? 0.8 : 0.2
    });
    const frontMat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: label.style === 'metallic' ? 0.25 : 0.6,
      metalness: label.style === 'metallic' ? 0.85 : 0.2
    });
    // 6 faces do Box: [+X, -X, +Y, -Y, +Z (Front), -Z]
    const materials = [sideMat, sideMat, sideMat, sideMat, frontMat, sideMat];
    mesh = new THREE.Mesh(geo, materials);
  }

  mesh.castShadow = true;
  mesh.receiveShadow = true;
  root.add(mesh);

  // Calcula posição padrão na face se x, y, z não estiverem definidos ou estiverem zerados no centro interno
  const face: ChassisFace = label.face || 'front';
  const defaultCoords = getDefaultFaceCoordinates(face, chassisWidth, chassisHeight, chassisDepth);

  const isPositionUnset =
    (label.x === undefined && label.y === undefined && label.z === undefined) ||
    (label.x === 0 && label.y === 0 && label.z === 0 && !label.rotX && !label.rotY && !label.rotZ);

  const posX = isPositionUnset ? defaultCoords.x : (label.x ?? defaultCoords.x);
  const posY = isPositionUnset ? defaultCoords.y : (label.y ?? defaultCoords.y);
  const posZ = isPositionUnset ? defaultCoords.z : (label.z ?? defaultCoords.z);
  const rotX = isPositionUnset ? defaultCoords.rotX : (label.rotX ?? defaultCoords.rotX);
  const rotY = isPositionUnset ? defaultCoords.rotY : (label.rotY ?? defaultCoords.rotY);
  const rotZ = isPositionUnset ? defaultCoords.rotZ : (label.rotZ ?? defaultCoords.rotZ);

  root.position.set(posX, posY, posZ);
  root.rotation.set(rotX, rotY, rotZ);

  root.userData = {
    isSelectable: true,
    elementId: `label_${label.id}`,
    elementName: `Texto: "${label.text}"`,
    isTextLabel: true,
    labelId: label.id,
    baseX: posX,
    baseY: posY,
    baseZ: posZ,
    baseRotX: rotX,
    baseRotY: rotY,
    baseRotZ: rotZ,
    face
  };

  return root;
}

/**
 * Retorna as coordenadas 3D padrão de posicionamento encostado na superfície de qualquer face do chassi
 */
export function getDefaultFaceCoordinates(
  face: ChassisFace,
  width: number,
  height: number,
  depth: number
): { x: number; y: number; z: number; rotX: number; rotY: number; rotZ: number } {
  const pad = 0.05; // 0.5 mm acima da superfície da chapa para nitidez total
  switch (face) {
    case 'rear':
      return { x: 0, y: 0, z: -depth / 2 - pad, rotX: 0, rotY: Math.PI, rotZ: 0 };
    case 'top':
      return { x: 0, y: height / 2 + pad, z: 0, rotX: -Math.PI / 2, rotY: 0, rotZ: 0 };
    case 'bottom':
      return { x: 0, y: -height / 2 - pad, z: 0, rotX: Math.PI / 2, rotY: 0, rotZ: 0 };
    case 'left':
      return { x: -width / 2 - pad, y: 0, z: 0, rotX: 0, rotY: -Math.PI / 2, rotZ: 0 };
    case 'right':
      return { x: width / 2 + pad, y: 0, z: 0, rotX: 0, rotY: Math.PI / 2, rotZ: 0 };
    case 'front':
    default:
      return { x: 0, y: 0, z: depth / 2 + pad, rotX: 0, rotY: 0, rotZ: 0 };
  }
}

/**
 * Adiciona todas as etiquetas de texto configuradas ao roteador
 */
export function addTextLabelsToRouter(root: THREE.Group, config: RouterConfig): void {
  if (!config.labels || config.labels.length === 0) return;

  const { width, height, depth } = config.chassis;

  for (const label of config.labels) {
    const off = config.offsets?.[`label_${label.id}`];
    if (off?.hidden) continue;

    const labelMesh = createTextLabelMesh(label, width, height, depth);

    // Se houver offset adicional configurado pelo gizmo ou sliders
    if (off) {
      const isRear = label.face === 'rear';
      labelMesh.position.x += isRear ? -(off.x ?? 0) : (off.x ?? 0);
      labelMesh.position.y += off.y ?? 0;
      labelMesh.position.z += off.z ?? 0;
      if (off.rotX) labelMesh.rotation.x += off.rotX;
      if (off.rotY) labelMesh.rotation.y += off.rotY;
      if (off.rotZ) labelMesh.rotation.z += off.rotZ;

      if (off.scale !== undefined || off.scaleX !== undefined || off.scaleY !== undefined || off.scaleZ !== undefined) {
        const sc = off.scale ?? 1.0;
        labelMesh.scale.set(
          (off.scaleX ?? 1.0) * sc,
          (off.scaleY ?? 1.0) * sc,
          (off.scaleZ ?? 1.0) * sc
        );
      }
    }

    root.add(labelMesh);
  }
}
