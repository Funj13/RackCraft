import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { RouterConfig, PaintSettings, ElementId, ChassisFace, TextLabelConfig, TextLabelStyle } from '../types/router';
import { TextureManager } from '../painter/TextureManager';
import { buildCompleteRouter } from '../generator/RouterBuilder';
import {
  Rotate3d,
  Compass,
  Eye,
  Sparkles,
  Move,
  Paintbrush,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  X,
  Sliders,
  CheckCircle2,
  Globe,
  Layers,
  RefreshCw,
  Type,
  Crosshair,
  Check,
  Tag,
  Trash2
} from 'lucide-react';

interface Viewport3DProps {
  config: RouterConfig;
  onChangeConfig?: (updater: (prev: RouterConfig) => RouterConfig) => void;
  textureManager: TextureManager;
  paintSettings: PaintSettings;
  onColorPick?: (color: string) => void;
  textureVersion: number;
  selectedElementId?: ElementId | null;
  onSelectElement?: (id: ElementId | null) => void;
  viewportMode?: 'paint' | 'move' | 'rotate' | 'write';
  onViewportModeChange?: (mode: 'paint' | 'move' | 'rotate' | 'write') => void;
}

export const Viewport3D: React.FC<Viewport3DProps> = ({
  config,
  onChangeConfig,
  textureManager,
  paintSettings,
  onColorPick,
  textureVersion,
  selectedElementId: propsSelectedElementId,
  onSelectElement,
  viewportMode: propsViewportMode,
  onViewportModeChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const transformControlsRef = useRef<TransformControls | null>(null);
  const selectionBoxRef = useRef<THREE.BoxHelper | null>(null);
  const routerModelRef = useRef<THREE.Group | null>(null);

  const isPaintingRef = useRef<boolean>(false);
  const lastUVRef = useRef<{ u: number; v: number } | null>(null);
  const isDraggingGizmoRef = useRef<boolean>(false);

  // Controle de arrasto direto do texto com o mouse pela carcaça
  const isDirectDraggingTextRef = useRef<boolean>(false);
  const draggedTextObjectRef = useRef<THREE.Object3D | null>(null);

  // Modos de interação: Pintura 3D, Mover Peças, Girar Câmera, Escrever no Roteador
  const [internalMode, setInternalMode] = useState<'paint' | 'move' | 'rotate' | 'write'>('move');
  const viewportMode = propsViewportMode ?? internalMode;
  const setViewportMode = useCallback((mode: 'paint' | 'move' | 'rotate' | 'write') => {
    setInternalMode(mode);
    onViewportModeChange?.(mode);
  }, [onViewportModeChange]);

  // Modo do Gizmo: Translação (X, Y, Z), Rotação ou Escalar
  const [gizmoMode, setGizmoMode] = useState<'translate' | 'rotate' | 'scale'>('translate');
  const [gizmoSpace, setGizmoSpace] = useState<'world' | 'local'>('world');

  // Elemento selecionado no modo Mover
  const [internalSelectedElementId, setInternalSelectedElementId] = useState<ElementId | null>(null);
  const selectedElementId = propsSelectedElementId !== undefined ? propsSelectedElementId : internalSelectedElementId;
  const setSelectedElementId = useCallback((id: ElementId | null) => {
    setInternalSelectedElementId(id);
    onSelectElement?.(id);
  }, [onSelectElement]);

  const [selectedElementName, setSelectedElementName] = useState<string>('');
  const [selectableElements, setSelectableElements] = useState<{ id: ElementId; name: string }[]>([]);

  // Estado do Modal de Inscrição Direta por Clique 3D
  const [writeModalState, setWriteModalState] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    z: number;
    rotX: number;
    rotY: number;
    rotZ: number;
    face: ChassisFace;
  }>({
    isOpen: false,
    x: 0,
    y: 0,
    z: 0,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    face: 'front'
  });

  const [modalText, setModalText] = useState<string>('CISCO');
  const [modalStyle, setModalStyle] = useState<TextLabelStyle>('silkscreen');
  const [modalTextColor, setModalTextColor] = useState<string>('#ffffff');
  const [modalFontSize, setModalFontSize] = useState<number>(56);

  // Inicialização Three.js
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Cena
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090d16);
    sceneRef.current = scene;

    // 2. Câmera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(22, 18, 30);
    cameraRef.current = camera;

    // 3. Renderizador WebGL
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Controles de Órbita
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 150;
    controls.minDistance = 5;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // 5. TransformControls (Gizmo para mover elementos no roteador em todas as direções)
    const transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.size = 0.85;
    transformControls.setMode('translate');
    transformControls.showX = true;
    transformControls.showY = true;
    transformControls.showZ = true; // Desloca livremente em todos os eixos X, Y e Z
    transformControls.setSpace('world');

    transformControls.addEventListener('dragging-changed', (event: any) => {
      const isDragging = Boolean(event.value);
      isDraggingGizmoRef.current = isDragging;
      controls.enabled = !isDragging;

      // Ao soltar o arrasto com mouse, grava o offset 3D no config
      if (!isDragging && transformControls.object) {
        const obj = transformControls.object;
        const elemId = obj.userData?.elementId as ElementId;
        if (elemId) {
          const baseX = obj.userData?.baseX ?? 0;
          const baseY = obj.userData?.baseY ?? 0;
          const baseZ = obj.userData?.baseZ ?? 0;
          const baseRotX = obj.userData?.baseRotX ?? 0;
          const baseRotY = obj.userData?.baseRotY ?? 0;
          const baseRotZ = obj.userData?.baseRotZ ?? 0;

          const isRear = obj.userData?.face === 'rear' || Boolean(obj.userData?.isRear);
          const rawDeltaX = isRear ? (baseX - obj.position.x) : (obj.position.x - baseX);
          const newOffX = Math.round(rawDeltaX * 10) / 10;
          const newOffY = Math.round((obj.position.y - baseY) * 10) / 10;
          const newOffZ = Math.round((obj.position.z - baseZ) * 10) / 10;
          const newRotX = Math.round((obj.rotation.x - baseRotX) * 100) / 100;
          const newRotY = Math.round((obj.rotation.y - baseRotY) * 100) / 100;
          const newRotZ = Math.round((obj.rotation.z - baseRotZ) * 100) / 100;

          const currentScale = obj.scale.x || 1.0;
          const newScale = Math.round(currentScale * 100) / 100;

          if (obj.userData?.isTextLabel && obj.userData?.labelId) {
            const labelId = obj.userData.labelId;
            const finalX = Math.round(obj.position.x * 100) / 100;
            const finalY = Math.round(obj.position.y * 100) / 100;
            const finalZ = Math.round(obj.position.z * 100) / 100;
            const finalRotX = Math.round(obj.rotation.x * 100) / 100;
            const finalRotY = Math.round(obj.rotation.y * 100) / 100;
            const finalRotZ = Math.round(obj.rotation.z * 100) / 100;

            onChangeConfig?.((prev) => ({
              ...prev,
              labels: prev.labels?.map((l) =>
                l.id === labelId
                  ? {
                      ...l,
                      x: finalX,
                      y: finalY,
                      z: finalZ,
                      rotX: finalRotX,
                      rotY: finalRotY,
                      rotZ: finalRotZ,
                      scale: newScale
                    }
                  : l
              ),
              offsets: {
                ...prev.offsets,
                [elemId]: {
                  x: 0,
                  y: 0,
                  z: 0,
                  rotX: 0,
                  rotY: 0,
                  rotZ: 0,
                  scale: newScale,
                  face: (obj.userData?.face as ChassisFace) || 'front'
                }
              }
            }));
          } else {
            onChangeConfig?.((prev) => ({
              ...prev,
              offsets: {
                ...prev.offsets,
                [elemId]: {
                  x: newOffX,
                  y: newOffY,
                  z: newOffZ,
                  rotX: newRotX,
                  rotY: newRotY,
                  rotZ: newRotZ,
                  scale: newScale,
                  face: (obj.userData?.face as ChassisFace) || prev.offsets?.[elemId]?.face
                }
              }
            }));
          }
        }
      }
    });

    transformControls.addEventListener('change', () => {
      if (selectionBoxRef.current && transformControls.object) {
        selectionBoxRef.current.setFromObject(transformControls.object);
      }
    });

    scene.add(transformControls.getHelper());
    transformControlsRef.current = transformControls;

    // 6. BoxHelper para destaque visual do elemento selecionado
    const boxHelper = new THREE.BoxHelper(new THREE.Object3D(), 0x38bdf8);
    boxHelper.visible = false;
    scene.add(boxHelper);
    selectionBoxRef.current = boxHelper;

    // 7. Iluminação de Estúdio PBR
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight1.position.set(20, 35, 25);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 1024;
    dirLight1.shadow.mapSize.height = 1024;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.5);
    dirLight2.position.set(-25, 15, -20);
    scene.add(dirLight2);

    const dirLight3 = new THREE.DirectionalLight(0xffedd5, 0.4);
    dirLight3.position.set(0, -10, -30);
    scene.add(dirLight3);

    // 8. Grade sutil de chão
    const grid = new THREE.GridHelper(60, 30, 0x1e293b, 0x0f172a);
    grid.position.y = -config.chassis.height / 2 - 0.2;
    scene.add(grid);

    // 9. Loop de Renderização
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      if (!container.clientWidth || !container.clientHeight) return;
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize listener
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      if (!w || !h) return;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      transformControls.dispose();
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Reconstrói o modelo quando a configuração do roteador muda
  useEffect(() => {
    if (!sceneRef.current) return;

    if (routerModelRef.current) {
      // Desanexa gizmo antes de remover o modelo
      transformControlsRef.current?.detach();
      if (selectionBoxRef.current) selectionBoxRef.current.visible = false;

      sceneRef.current.remove(routerModelRef.current);
      routerModelRef.current.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry?.dispose();
        }
      });
    }

    const newModel = buildCompleteRouter(config, textureManager);
    sceneRef.current.add(newModel);
    routerModelRef.current = newModel;

    // Detecta todos os elementos selecionáveis presentes no modelo
    const items: { id: ElementId; name: string }[] = [];
    newModel.traverse((child) => {
      if (child.userData?.isSelectable && child.userData?.elementId) {
        // Evita duplicatas se houver mais de um mesh com mesmo id
        if (!items.some((it) => it.id === child.userData.elementId)) {
          items.push({
            id: child.userData.elementId as ElementId,
            name: child.userData.elementName || child.name
          });
        }
      }
    });
    setSelectableElements(items);

    // Se havia um elemento selecionado, reanexa o gizmo ao novo objeto reconstruído
    if (selectedElementId && viewportMode === 'move') {
      let found: THREE.Object3D | null = null;
      newModel.traverse((child) => {
        if (child.userData?.elementId === selectedElementId) {
          found = child;
        }
      });
      if (found && transformControlsRef.current) {
        transformControlsRef.current.attach(found);
        if (selectionBoxRef.current) {
          selectionBoxRef.current.setFromObject(found);
          selectionBoxRef.current.visible = true;
        }
      } else {
        transformControlsRef.current?.detach();
        if (selectionBoxRef.current) selectionBoxRef.current.visible = false;
        setSelectedElementId(null);
      }
    }
  }, [config, selectedElementId, viewportMode]);

  // Atualiza a textura no modelo quando a versão mudar
  useEffect(() => {
    if (routerModelRef.current) {
      routerModelRef.current.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          if (mesh.userData?.isPaintable && mesh.material) {
            const mat = mesh.material as THREE.MeshStandardMaterial;
            if (mat.map) mat.map.needsUpdate = true;
          }
        }
      });
    }
  }, [textureVersion]);

  // Quando o modo muda, atualiza o gizmo
  useEffect(() => {
    if (viewportMode !== 'move') {
      transformControlsRef.current?.detach();
      if (selectionBoxRef.current) selectionBoxRef.current.visible = false;
    }
  }, [viewportMode]);

  // Seleciona um elemento específico por ID
  const selectElementById = useCallback((id: ElementId | null) => {
    if (!routerModelRef.current || !transformControlsRef.current) return;

    if (!id) {
      transformControlsRef.current.detach();
      if (selectionBoxRef.current) selectionBoxRef.current.visible = false;
      setSelectedElementId(null);
      setSelectedElementName('');
      return;
    }

    let found: THREE.Object3D | null = null;
    routerModelRef.current.traverse((child) => {
      if (child.userData?.elementId === id) {
        found = child;
      }
    });

    if (found) {
      transformControlsRef.current.attach(found);
      if (selectionBoxRef.current) {
        selectionBoxRef.current.setFromObject(found);
        selectionBoxRef.current.visible = true;
      }
      setSelectedElementId(id);
      setSelectedElementName((found as THREE.Object3D).userData?.elementName || id);
      setViewportMode('move');
    }
  }, []);

  // Sincroniza modo (translação / rotação) e espaço (mundo / local) do Gizmo
  useEffect(() => {
    if (transformControlsRef.current) {
      transformControlsRef.current.setMode(gizmoMode);
    }
  }, [gizmoMode]);

  useEffect(() => {
    if (transformControlsRef.current) {
      transformControlsRef.current.setSpace(gizmoSpace);
    }
  }, [gizmoSpace]);

  // Altera o offset 3D de um elemento
  const updateOffset = useCallback((elementId: ElementId, deltaX: number, deltaY: number, deltaZ: number = 0) => {
    onChangeConfig?.((prev) => {
      const current = prev.offsets?.[elementId] || { x: 0, y: 0, z: 0 };
      const newX = Math.round((current.x + deltaX) * 10) / 10;
      const newY = Math.round((current.y + deltaY) * 10) / 10;
      const newZ = Math.round(((current.z ?? 0) + deltaZ) * 10) / 10;
      return {
        ...prev,
        offsets: {
          ...prev.offsets,
          [elementId]: { ...current, x: newX, y: newY, z: newZ }
        }
      };
    });
  }, [onChangeConfig]);

  // Define offset absoluto em um eixo específico (x, y, z)
  const setOffsetAxis = useCallback((elementId: ElementId, axis: 'x' | 'y' | 'z', value: number) => {
    onChangeConfig?.((prev) => {
      const current = prev.offsets?.[elementId] || { x: 0, y: 0, z: 0 };
      return {
        ...prev,
        offsets: {
          ...prev.offsets,
          [elementId]: {
            ...current,
            [axis]: Math.round(value * 10) / 10
          }
        }
      };
    });
  }, [onChangeConfig]);

  // Define escala do elemento selecionado
  const setElementScale = useCallback((elementId: ElementId, scaleValue: number) => {
    const sc = Math.round(scaleValue * 100) / 100;
    onChangeConfig?.((prev) => {
      const current = prev.offsets?.[elementId] || { x: 0, y: 0, z: 0 };
      if (elementId.startsWith('label_')) {
        const labelId = elementId.replace('label_', '');
        return {
          ...prev,
          labels: prev.labels?.map((l) => (l.id === labelId ? { ...l, scale: sc } : l)),
          offsets: {
            ...prev.offsets,
            [elementId]: { ...current, scale: sc }
          }
        };
      }
      return {
        ...prev,
        offsets: {
          ...prev.offsets,
          [elementId]: { ...current, scale: sc }
        }
      };
    });
  }, [onChangeConfig]);

  // Apaga / Esconde o elemento selecionado individualmente
  const deleteSelectedElement = useCallback(() => {
    if (!selectedElementId) return;
    const targetId = selectedElementId;

    onChangeConfig?.((prev) => {
      // Se for uma etiqueta de texto, remove da lista de labels e limpa offsets
      if (targetId.startsWith('label_')) {
        const labelId = targetId.replace('label_', '');
        const newOffsets = { ...prev.offsets };
        delete newOffsets[targetId];
        return {
          ...prev,
          labels: prev.labels?.filter((l) => l.id !== labelId) || [],
          offsets: newOffsets
        };
      }

      // Se for uma peça de hardware (porta, botão, fonte, led, etc.), marca como hidden
      const current = prev.offsets?.[targetId] || { x: 0, y: 0, z: 0 };
      return {
        ...prev,
        offsets: {
          ...prev.offsets,
          [targetId]: { ...current, hidden: true }
        }
      };
    });

    selectElementById(null);
  }, [selectedElementId, onChangeConfig, selectElementById]);

  // Gira o elemento selecionado em 90 graus no eixo especificado
  const rotateElement90 = useCallback((axis: 'x' | 'y' | 'z') => {
    if (!selectedElementId) return;
    onChangeConfig?.((prev) => {
      const current = prev.offsets?.[selectedElementId] || { x: 0, y: 0, z: 0 };
      const rotKey = axis === 'x' ? 'rotX' : axis === 'y' ? 'rotY' : 'rotZ';
      const curRot = current[rotKey] ?? 0;
      const newRot = Math.round((curRot + Math.PI / 2) * 100) / 100;
      return {
        ...prev,
        offsets: {
          ...prev.offsets,
          [selectedElementId]: {
            ...current,
            [rotKey]: newRot
          }
        }
      };
    });
  }, [selectedElementId, onChangeConfig]);

  // Fixa o elemento automaticamente em qualquer uma das 6 faces do chassi (Frente, Trás, Topo, Base, Laterais)
  const snapToFace = useCallback((face: ChassisFace) => {
    if (!selectedElementId || !transformControlsRef.current?.object) return;
    const obj = transformControlsRef.current.object;
    const { width, height, depth } = config.chassis;

    const baseX = obj.userData?.baseX ?? 0;
    const baseY = obj.userData?.baseY ?? 0;
    const baseZ = obj.userData?.baseZ ?? 0;
    const baseRotX = obj.userData?.baseRotX ?? 0;
    const baseRotY = obj.userData?.baseRotY ?? 0;
    const baseRotZ = obj.userData?.baseRotZ ?? 0;

    let targetX = 0;
    let targetY = 0;
    let targetZ = 0;
    let targetRotX = 0;
    let targetRotY = 0;
    let targetRotZ = 0;

    const pad = 0.05;

    if (face === 'front') {
      targetZ = depth / 2 + pad;
      targetRotY = 0;
    } else if (face === 'rear') {
      targetZ = -depth / 2 - pad;
      targetRotY = Math.PI;
    } else if (face === 'top') {
      targetY = height / 2 + pad;
      targetRotX = -Math.PI / 2;
    } else if (face === 'bottom') {
      targetY = -height / 2 - pad;
      targetRotX = Math.PI / 2;
    } else if (face === 'left') {
      targetX = -width / 2 - pad;
      targetRotY = -Math.PI / 2;
    } else if (face === 'right') {
      targetX = width / 2 + pad;
      targetRotY = Math.PI / 2;
    }

    const isRear = face === 'rear';
    const rawDeltaX = isRear ? (baseX - targetX) : (targetX - baseX);
    const newOffX = Math.round(rawDeltaX * 10) / 10;
    const newOffY = Math.round((targetY - baseY) * 10) / 10;
    const newOffZ = Math.round((targetZ - baseZ) * 10) / 10;
    const newRotX = Math.round((targetRotX - baseRotX) * 100) / 100;
    const newRotY = Math.round((targetRotY - baseRotY) * 100) / 100;
    const newRotZ = Math.round((targetRotZ - baseRotZ) * 100) / 100;

    if (obj.userData?.isTextLabel && obj.userData?.labelId) {
      const labelId = obj.userData.labelId;
      onChangeConfig?.((prev) => ({
        ...prev,
        labels: prev.labels?.map((l) =>
          l.id === labelId
            ? { ...l, face, x: targetX, y: targetY, z: targetZ, rotX: targetRotX, rotY: targetRotY, rotZ: targetRotZ }
            : l
        ),
        offsets: {
          ...prev.offsets,
          [selectedElementId]: { x: 0, y: 0, z: 0, rotX: 0, rotY: 0, rotZ: 0, face }
        }
      }));
    } else {
      onChangeConfig?.((prev) => ({
        ...prev,
        offsets: {
          ...prev.offsets,
          [selectedElementId]: { x: newOffX, y: newOffY, z: newOffZ, rotX: newRotX, rotY: newRotY, rotZ: newRotZ, face }
        }
      }));
    }
  }, [selectedElementId, config.chassis, onChangeConfig]);

  // Reseta offset para 0
  const resetOffset = useCallback((elementId: ElementId) => {
    onChangeConfig?.((prev) => ({
      ...prev,
      offsets: {
        ...prev.offsets,
        [elementId]: { x: 0, y: 0, z: 0, rotX: 0, rotY: 0, rotZ: 0 }
      }
    }));
  }, [onChangeConfig]);

  // Confirmação do modal de texto posicionado diretamente por clique 3D
  const handleConfirmWriteModal = useCallback(() => {
    if (!modalText.trim()) return;
    const newId = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    const newLabel: TextLabelConfig = {
      id: newId,
      text: modalText.trim(),
      style: modalStyle,
      textColor: modalTextColor,
      face: writeModalState.face,
      fontSize: modalFontSize,
      x: writeModalState.x,
      y: writeModalState.y,
      z: writeModalState.z,
      rotX: writeModalState.rotX,
      rotY: writeModalState.rotY,
      rotZ: writeModalState.rotZ,
      scale: 1.0
    };

    onChangeConfig?.((prev) => ({
      ...prev,
      labels: [...(prev.labels || []), newLabel]
    }));

    setWriteModalState((s) => ({ ...s, isOpen: false }));
    setSelectedElementId(`label_${newId}`);
    setViewportMode('move');
  }, [modalText, modalStyle, modalTextColor, modalFontSize, writeModalState, onChangeConfig, setSelectedElementId, setViewportMode]);

  // Atalhos de Teclado (M = Mover, P = Pintar, T = Escrever, Setas = Mover Peça)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current?.clientWidth || !containerRef.current?.clientHeight) return;
      // Ignora se estiver digitando em input ou select
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'm' || e.key === 'M') {
        setViewportMode('move');
      } else if (e.key === 'p' || e.key === 'P') {
        setViewportMode('paint');
      } else if (e.key === 't' || e.key === 'T') {
        setViewportMode('write');
      } else if (e.key === 'Escape') {
        if (writeModalState.isOpen) {
          setWriteModalState((s) => ({ ...s, isOpen: false }));
        } else {
          selectElementById(null);
        }
      }

      // Se houver elemento selecionado no modo Mover: Setas do teclado deslocam
      if (viewportMode === 'move' && selectedElementId) {
        const step = e.shiftKey ? 1.0 : 0.2;
        const selectedObj = transformControlsRef.current?.object;
        const currentFace: ChassisFace =
          (selectedObj?.userData?.face as ChassisFace) ||
          config.offsets?.[selectedElementId]?.face ||
          (selectedElementId.startsWith('label_')
            ? config.labels?.find((l) => `label_${l.id}` === selectedElementId)?.face
            : undefined) ||
          'front';

        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          if (currentFace === 'left') {
            updateOffset(selectedElementId, 0, 0, step);
          } else if (currentFace === 'right') {
            updateOffset(selectedElementId, 0, 0, -step);
          } else {
            updateOffset(selectedElementId, -step, 0, 0);
          }
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          if (currentFace === 'left') {
            updateOffset(selectedElementId, 0, 0, -step);
          } else if (currentFace === 'right') {
            updateOffset(selectedElementId, 0, 0, step);
          } else {
            updateOffset(selectedElementId, step, 0, 0);
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (currentFace === 'top') {
            // No topo: visualmente para cima vai em direção à traseira do chassi (-Z no Three.js)
            updateOffset(selectedElementId, 0, 0, -step);
          } else if (currentFace === 'bottom') {
            updateOffset(selectedElementId, 0, 0, step);
          } else {
            // Frente, traseira, laterais: sobe em Y (+step)
            updateOffset(selectedElementId, 0, step, 0);
          }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (currentFace === 'top') {
            // No topo: visualmente para baixo vai em direção à frente do chassi (+Z no Three.js)
            updateOffset(selectedElementId, 0, 0, step);
          } else if (currentFace === 'bottom') {
            updateOffset(selectedElementId, 0, 0, -step);
          } else {
            // Frente, traseira, laterais: desce em Y (-step)
            updateOffset(selectedElementId, 0, -step, 0);
          }
        } else if (e.key === 'PageUp' || e.key === 'w' || e.key === 'W') {
          e.preventDefault();
          if (currentFace === 'top' || currentFace === 'bottom') {
            updateOffset(selectedElementId, 0, step, 0); // elevação em Y no topo
          } else {
            updateOffset(selectedElementId, 0, 0, step);
          }
        } else if (e.key === 'PageDown' || e.key === 's' || e.key === 'S') {
          e.preventDefault();
          if (currentFace === 'top' || currentFace === 'bottom') {
            updateOffset(selectedElementId, 0, -step, 0); // elevação em Y no topo
          } else {
            updateOffset(selectedElementId, 0, 0, -step);
          }
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          deleteSelectedElement();
        } else if (e.key === '0') {
          e.preventDefault();
          resetOffset(selectedElementId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewportMode, selectedElementId, updateOffset, resetOffset, deleteSelectedElement, selectElementById, setViewportMode, writeModalState.isOpen]);

  // Câmera rápida
  const setCameraView = (view: 'iso' | 'front' | 'rear' | 'top') => {
    if (!cameraRef.current || !controlsRef.current) return;
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    ctrl.target.set(0, 0, 0);

    const dist = Math.max(config.chassis.width, config.chassis.depth) * 1.6;

    if (view === 'iso') {
      cam.position.set(dist * 0.8, dist * 0.7, dist * 0.9);
    } else if (view === 'front') {
      cam.position.set(0, 0, dist * 1.2);
    } else if (view === 'rear') {
      cam.position.set(0, 0, -dist * 1.2);
    } else if (view === 'top') {
      cam.position.set(0, dist * 1.3, 0.001);
    }
    ctrl.update();
  };

  // Eventos de Ponteiro: Pintura, Seleção/Arrasto no Modo Mover OU Clique para Escrever
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Botão direito = rotacionar câmera em qualquer modo
    if (e.button === 2) return;

    if (!containerRef.current || !cameraRef.current || !routerModelRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    // MODO ESCREVER NO ROTEADOR (CLIQUE & DIGITE)
    if (viewportMode === 'write') {
      const intersects = raycaster.intersectObjects(routerModelRef.current.children, true);
      const hit = intersects.find(
        (h) => h.object.userData?.isPaintable || h.object.name?.includes('Chassis') || h.object.parent?.name?.includes('Chassis')
      ) || intersects[0];

      if (hit && hit.face) {
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
        const worldNormal = hit.face.normal.clone().applyMatrix3(normalMatrix).normalize();

        let face: ChassisFace = 'front';
        let rotX = 0, rotY = 0, rotZ = 0;
        const absZ = Math.abs(worldNormal.z);
        const absY = Math.abs(worldNormal.y);
        const absX = Math.abs(worldNormal.x);

        if (absZ >= absX && absZ >= absY) {
          if (worldNormal.z > 0) {
            face = 'front';
            rotX = 0; rotY = 0; rotZ = 0;
          } else {
            face = 'rear';
            rotX = 0; rotY = Math.PI; rotZ = 0;
          }
        } else if (absY >= absX) {
          if (worldNormal.y > 0) {
            face = 'top';
            rotX = -Math.PI / 2; rotY = 0; rotZ = 0;
          } else {
            face = 'bottom';
            rotX = Math.PI / 2; rotY = 0; rotZ = 0;
          }
        } else {
          if (worldNormal.x > 0) {
            face = 'right';
            rotX = 0; rotY = Math.PI / 2; rotZ = 0;
          } else {
            face = 'left';
            rotX = 0; rotY = -Math.PI / 2; rotZ = 0;
          }
        }

        const pad = 0.05;
        const posX = Math.round((hit.point.x + worldNormal.x * pad) * 100) / 100;
        const posY = Math.round((hit.point.y + worldNormal.y * pad) * 100) / 100;
        const posZ = Math.round((hit.point.z + worldNormal.z * pad) * 100) / 100;

        setWriteModalState({
          isOpen: true,
          x: posX,
          y: posY,
          z: posZ,
          rotX,
          rotY,
          rotZ,
          face
        });
      }
      return;
    }

    // MODO MOVER: Raycasting para selecionar peça OU iniciar arrasto direto do texto
    if (viewportMode === 'move') {
      if (isDraggingGizmoRef.current) return;

      const intersects = raycaster.intersectObjects(routerModelRef.current.children, true);
      let targetSelectable: THREE.Object3D | null = null;

      for (const hit of intersects) {
        let curr: THREE.Object3D | null = hit.object;
        while (curr && curr !== routerModelRef.current) {
          if (curr.userData?.isSelectable) {
            targetSelectable = curr;
            break;
          }
          curr = curr.parent;
        }
        if (targetSelectable) break;
      }

      if (targetSelectable) {
        const elemId = targetSelectable.userData?.elementId as ElementId;
        selectElementById(elemId);

        // Se clicou diretamente em uma etiqueta de texto, habilita arrasto com o mouse na superfície
        if (targetSelectable.userData?.isTextLabel) {
          isDirectDraggingTextRef.current = true;
          draggedTextObjectRef.current = targetSelectable;
          if (controlsRef.current) controlsRef.current.enabled = false;
        }
      }
      return;
    }

    // MODO PINTURA 3D
    if (viewportMode === 'paint') {
      const intersects = raycaster.intersectObjects(routerModelRef.current.children, true);
      const paintableHit = intersects.find((hit) => hit.object.userData?.isPaintable && hit.uv);

      if (paintableHit && paintableHit.uv) {
        if (controlsRef.current) controlsRef.current.enabled = false;
        isPaintingRef.current = true;
        const { x: u, y: v } = paintableHit.uv;
        lastUVRef.current = { u, v };

        if (paintSettings.tool === 'picker') {
          const pickedColor = textureManager.getColorAtUV(u, v);
          onColorPick?.(pickedColor);
        } else if (paintSettings.tool === 'bucket') {
          textureManager.saveState();
          textureManager.floodFillUV(u, v, paintSettings.color);
        } else if (paintSettings.tool === 'decal') {
          if (paintSettings.activeDecal === 'custom_text' && paintSettings.customText) {
            textureManager.stampText(u, v, paintSettings.customText, paintSettings.color);
          } else if (paintSettings.activeDecal) {
            textureManager.stampDecal(u, v, paintSettings.activeDecal, 1.2);
          }
        } else if (paintSettings.tool === 'brush') {
          textureManager.saveState();
          textureManager.drawBrush(u, v, paintSettings.brushSize, paintSettings.color, paintSettings.opacity);
        } else if (paintSettings.tool === 'eraser') {
          textureManager.saveState();
          textureManager.drawBrush(u, v, paintSettings.brushSize, config.chassis.baseColor, 1);
        }
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // ARRASTO DIRETO DE TEXTO PELA SUPERFÍCIE DO CHASSI
    if (isDirectDraggingTextRef.current && draggedTextObjectRef.current && routerModelRef.current && containerRef.current && cameraRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

      const hits = raycaster.intersectObjects(
        routerModelRef.current.children.filter((c) => c !== draggedTextObjectRef.current),
        true
      );

      const chassisHit = hits.find(
        (h) => h.object.userData?.isPaintable || h.object.name?.includes('Chassis') || h.object.parent?.name?.includes('Chassis')
      ) || hits[0];

      if (chassisHit && chassisHit.face) {
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(chassisHit.object.matrixWorld);
        const worldNormal = chassisHit.face.normal.clone().applyMatrix3(normalMatrix).normalize();

        let face: ChassisFace = 'front';
        let rotX = 0, rotY = 0, rotZ = 0;
        const absZ = Math.abs(worldNormal.z);
        const absY = Math.abs(worldNormal.y);
        const absX = Math.abs(worldNormal.x);

        if (absZ >= absX && absZ >= absY) {
          if (worldNormal.z > 0) {
            face = 'front';
            rotX = 0; rotY = 0; rotZ = 0;
          } else {
            face = 'rear';
            rotX = 0; rotY = Math.PI; rotZ = 0;
          }
        } else if (absY >= absX) {
          if (worldNormal.y > 0) {
            face = 'top';
            rotX = -Math.PI / 2; rotY = 0; rotZ = 0;
          } else {
            face = 'bottom';
            rotX = Math.PI / 2; rotY = 0; rotZ = 0;
          }
        } else {
          if (worldNormal.x > 0) {
            face = 'right';
            rotX = 0; rotY = Math.PI / 2; rotZ = 0;
          } else {
            face = 'left';
            rotX = 0; rotY = -Math.PI / 2; rotZ = 0;
          }
        }

        const pad = 0.05;
        const obj = draggedTextObjectRef.current;
        obj.position.copy(chassisHit.point).add(worldNormal.clone().multiplyScalar(pad));
        obj.rotation.set(rotX, rotY, rotZ);
        obj.userData.face = face;

        if (selectionBoxRef.current) {
          selectionBoxRef.current.setFromObject(obj);
        }
      }
      return;
    }

    // PINTURA 3D
    if (viewportMode !== 'paint' || !isPaintingRef.current) return;
    if (!containerRef.current || !cameraRef.current || !routerModelRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    const intersects = raycaster.intersectObjects(routerModelRef.current.children, true);
    const paintableHit = intersects.find((hit) => hit.object.userData?.isPaintable && hit.uv);

    if (paintableHit && paintableHit.uv && lastUVRef.current) {
      const { x: u, y: v } = paintableHit.uv;
      if (paintSettings.tool === 'brush') {
        textureManager.drawBrushLine(
          lastUVRef.current.u,
          lastUVRef.current.v,
          u,
          v,
          paintSettings.brushSize,
          paintSettings.color,
          paintSettings.opacity
        );
      } else if (paintSettings.tool === 'eraser') {
        textureManager.drawBrushLine(
          lastUVRef.current.u,
          lastUVRef.current.v,
          u,
          v,
          paintSettings.brushSize,
          config.chassis.baseColor,
          1
        );
      }
      lastUVRef.current = { u, v };
    }
  };

  const handlePointerUp = () => {
    isPaintingRef.current = false;
    lastUVRef.current = null;

    // Finaliza arrasto direto de texto e salva no config
    if (isDirectDraggingTextRef.current && draggedTextObjectRef.current) {
      const obj = draggedTextObjectRef.current;
      const labelId = obj.userData?.labelId;
      const face = (obj.userData?.face as ChassisFace) || 'front';

      isDirectDraggingTextRef.current = false;
      draggedTextObjectRef.current = null;

      if (labelId) {
        const finalX = Math.round(obj.position.x * 100) / 100;
        const finalY = Math.round(obj.position.y * 100) / 100;
        const finalZ = Math.round(obj.position.z * 100) / 100;
        const finalRotX = Math.round(obj.rotation.x * 100) / 100;
        const finalRotY = Math.round(obj.rotation.y * 100) / 100;
        const finalRotZ = Math.round(obj.rotation.z * 100) / 100;

        onChangeConfig?.((prev) => ({
          ...prev,
          labels: prev.labels?.map((l) =>
            l.id === labelId
              ? {
                  ...l,
                  x: finalX,
                  y: finalY,
                  z: finalZ,
                  rotX: finalRotX,
                  rotY: finalRotY,
                  rotZ: finalRotZ,
                  face
                }
              : l
          ),
          offsets: {
            ...prev.offsets,
            [`label_${labelId}`]: { x: 0, y: 0, z: 0, rotX: 0, rotY: 0, rotZ: 0 }
          }
        }));
      }
    }

    if (controlsRef.current && !isDraggingGizmoRef.current) {
      controlsRef.current.enabled = true;
    }
  };

  // Coordenadas atuais do offset 3D do elemento selecionado
  const currentOffset = selectedElementId
    ? config.offsets?.[selectedElementId] || { x: 0, y: 0, z: 0 }
    : { x: 0, y: 0, z: 0 };
  const currentZ = currentOffset.z ?? 0;
  const maxRangeX = Math.max(30, Math.ceil(config.chassis.width / 2 + 10));
  const maxRangeY = Math.max(10, Math.ceil(config.chassis.height / 2 + 6));
  const maxRangeZ = Math.max(30, Math.ceil(config.chassis.depth / 2 + 10));

  const selectedObj = transformControlsRef.current?.object;
  const currentSelectedFace: ChassisFace =
    (selectedObj?.userData?.face as ChassisFace) ||
    config.offsets?.[selectedElementId || '']?.face ||
    (selectedElementId?.startsWith('label_')
      ? config.labels?.find((l) => `label_${l.id}` === selectedElementId)?.face
      : undefined) ||
    'front';

  const getFaceAxisConfig = (face: ChassisFace) => {
    switch (face) {
      case 'top':
        return {
          slider1: {
            axis: 'x' as const,
            label: 'X (Horizontal):',
            color: 'text-red-400',
            accent: 'accent-red-400',
            max: maxRangeX,
            value: currentOffset.x ?? 0
          },
          slider2: {
            axis: 'z' as const,
            label: 'Z (Frente/Trás):',
            color: 'text-sky-400',
            accent: 'accent-sky-400',
            max: maxRangeZ,
            value: currentOffset.z ?? 0
          },
          slider3: {
            axis: 'y' as const,
            label: 'Y (Altura da Chapa):',
            color: 'text-emerald-400',
            accent: 'accent-emerald-400',
            max: maxRangeY,
            value: currentOffset.y ?? 0
          }
        };
      case 'bottom':
        return {
          slider1: {
            axis: 'x' as const,
            label: 'X (Horizontal):',
            color: 'text-red-400',
            accent: 'accent-red-400',
            max: maxRangeX,
            value: currentOffset.x ?? 0
          },
          slider2: {
            axis: 'z' as const,
            label: 'Z (Frente/Trás):',
            color: 'text-sky-400',
            accent: 'accent-sky-400',
            max: maxRangeZ,
            value: currentOffset.z ?? 0
          },
          slider3: {
            axis: 'y' as const,
            label: 'Y (Elevação Base):',
            color: 'text-emerald-400',
            accent: 'accent-emerald-400',
            max: maxRangeY,
            value: currentOffset.y ?? 0
          }
        };
      case 'left':
      case 'right':
        return {
          slider1: {
            axis: 'z' as const,
            label: 'Z (Frente/Trás):',
            color: 'text-sky-400',
            accent: 'accent-sky-400',
            max: maxRangeZ,
            value: currentOffset.z ?? 0
          },
          slider2: {
            axis: 'y' as const,
            label: 'Y (Vertical):',
            color: 'text-emerald-400',
            accent: 'accent-emerald-400',
            max: maxRangeY,
            value: currentOffset.y ?? 0
          },
          slider3: {
            axis: 'x' as const,
            label: 'X (Distância Lateral):',
            color: 'text-red-400',
            accent: 'accent-red-400',
            max: maxRangeX,
            value: currentOffset.x ?? 0
          }
        };
      case 'rear':
        return {
          slider1: {
            axis: 'x' as const,
            label: 'X (Horizontal Traseira):',
            color: 'text-red-400',
            accent: 'accent-red-400',
            max: maxRangeX,
            value: currentOffset.x ?? 0
          },
          slider2: {
            axis: 'y' as const,
            label: 'Y (Vertical):',
            color: 'text-emerald-400',
            accent: 'accent-emerald-400',
            max: maxRangeY,
            value: currentOffset.y ?? 0
          },
          slider3: {
            axis: 'z' as const,
            label: 'Z (Profundidade):',
            color: 'text-sky-400',
            accent: 'accent-sky-400',
            max: maxRangeZ,
            value: currentOffset.z ?? 0
          }
        };
      case 'front':
      default:
        return {
          slider1: {
            axis: 'x' as const,
            label: 'X (Horizontal):',
            color: 'text-red-400',
            accent: 'accent-red-400',
            max: maxRangeX,
            value: currentOffset.x ?? 0
          },
          slider2: {
            axis: 'y' as const,
            label: 'Y (Vertical):',
            color: 'text-emerald-400',
            accent: 'accent-emerald-400',
            max: maxRangeY,
            value: currentOffset.y ?? 0
          },
          slider3: {
            axis: 'z' as const,
            label: 'Z (Profundidade):',
            color: 'text-sky-400',
            accent: 'accent-sky-400',
            max: maxRangeZ,
            value: currentOffset.z ?? 0
          }
        };
    }
  };

  const axisCfg = getFaceAxisConfig(currentSelectedFace);

  return (
    <div className="relative w-full h-full flex flex-col select-none overflow-hidden bg-slate-950">
      {/* Viewport 3D Canvas Container */}
      <div
        ref={containerRef}
        className={`w-full h-full ${
          viewportMode === 'paint' || viewportMode === 'write'
            ? 'cursor-crosshair'
            : viewportMode === 'move'
            ? 'cursor-move'
            : 'cursor-grab active:cursor-grabbing'
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />

      {/* Floating Toolbar: Modos de Interação */}
      <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/60 shadow-xl text-xs z-10 flex-wrap">
        {/* Modo Pintura */}
        <button
          onClick={() => setViewportMode('paint')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
            viewportMode === 'paint'
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/40'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
          title="Modo Pintar 3D (Atalho: P)"
        >
          <Paintbrush className="w-3.5 h-3.5" />
          <span>Pintar (P)</span>
        </button>

        {/* Modo Mover Peças */}
        <button
          onClick={() => setViewportMode('move')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
            viewportMode === 'move'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/40'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
          title="Modo Mover e Reposicionar Peças em 3D (Atalho: M)"
        >
          <Move className="w-3.5 h-3.5" />
          <span>Mover Livremente (M)</span>
        </button>

        {/* Modo Escrever no Roteador (Clique & Digite) */}
        <button
          onClick={() => setViewportMode('write')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
            viewportMode === 'write'
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/40'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
          title="Modo Escrever: Clique em qualquer ponto do roteador para posicionar o texto (Atalho: T)"
        >
          <Type className="w-3.5 h-3.5" />
          <span>Escrever no Roteador (T)</span>
        </button>

        {/* Modo Girar Câmera */}
        <button
          onClick={() => setViewportMode('rotate')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
            viewportMode === 'rotate'
              ? 'bg-sky-500 text-white shadow-md shadow-sky-500/40'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
          title="Modo Girar Câmera Livremente"
        >
          <Rotate3d className="w-3.5 h-3.5" />
          <span>Girar Câmera</span>
        </button>

        <div className="w-px h-5 bg-slate-700 mx-1" />

        {/* Câmeras Rápidas */}
        <button
          onClick={() => setCameraView('iso')}
          className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-md transition text-[11px]"
        >
          Iso
        </button>
        <button
          onClick={() => setCameraView('front')}
          className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-md transition text-[11px]"
        >
          Frente
        </button>
        <button
          onClick={() => setCameraView('rear')}
          className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-md transition text-[11px]"
        >
          Traseira
        </button>
        <button
          onClick={() => setCameraView('top')}
          className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-md transition text-[11px]"
        >
          Topo
        </button>
      </div>

      {/* FLOATING HUD: Painel de Controle de Movimentação em Todas as Direções */}
      {viewportMode === 'move' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md px-4 py-3 rounded-2xl border border-amber-500/50 shadow-2xl shadow-amber-950/40 flex flex-col gap-2.5 max-w-xl w-[94%] sm:w-[540px] z-20 text-xs text-slate-200">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                <Move className="w-4 h-4" />
              </span>
              <div>
                <div className="font-bold text-amber-400 text-sm leading-none">
                  Posicionamento Livre 3D
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Mova peças e textos em qualquer direção (X, Y, Z) ou fixe nas faces
                </div>
              </div>
            </div>

            {/* Seletor dropdown direto */}
            <select
              value={selectedElementId || ''}
              onChange={(e) => selectElementById((e.target.value as ElementId) || null)}
              className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1 text-xs outline-none font-medium cursor-pointer max-w-[200px] truncate"
            >
              <option value="">-- Escolher Peça / Texto --</option>
              {selectableElements.map((elem) => (
                <option key={elem.id} value={elem.id}>
                  {elem.name}
                </option>
              ))}
            </select>
          </div>

          {selectedElementId ? (
            <div className="space-y-3">
              {/* Barra superior de controle do Gizmo */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Item:</span>
                  <strong className="text-sky-300 font-semibold truncate max-w-[170px]">
                    {selectedElementName}
                  </strong>
                </div>

                {/* Modos do Gizmo 3D (Mover vs Girar vs Escalar) */}
                <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setGizmoMode('translate')}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition cursor-pointer flex items-center gap-1 ${
                      gizmoMode === 'translate'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Mover nos eixos X, Y e Z"
                  >
                    <Move className="w-3 h-3" />
                    <span>Mover</span>
                  </button>

                  <button
                    onClick={() => setGizmoMode('rotate')}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition cursor-pointer flex items-center gap-1 ${
                      gizmoMode === 'rotate'
                        ? 'bg-sky-500 text-white font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Rotacionar em 3D"
                  >
                    <Rotate3d className="w-3 h-3" />
                    <span>Girar</span>
                  </button>

                  <button
                    onClick={() => setGizmoMode('scale')}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition cursor-pointer flex items-center gap-1 ${
                      gizmoMode === 'scale'
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Redimensionar tamanho do objeto selecionado"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Escalar</span>
                  </button>

                  <button
                    onClick={() => setGizmoSpace(gizmoSpace === 'world' ? 'local' : 'world')}
                    className="px-1.5 py-1 text-slate-400 hover:text-white text-[10px] rounded transition flex items-center gap-1 ml-1"
                    title={`Espaço atual: ${gizmoSpace}. Clique para alternar.`}
                  >
                    <Globe className="w-3 h-3 text-emerald-400" />
                    <span>{gizmoSpace === 'world' ? 'Mundo' : 'Local'}</span>
                  </button>
                </div>
              </div>

              {/* Botões de Fixação Rápida em Qualquer Face / Direção */}
              <div className="space-y-1.5 bg-slate-950/40 p-2 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-300 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-amber-400" /> Fixar em Face / Direção:
                  </span>
                  <span className="text-[10px] text-slate-400">Encaixa na superfície</span>
                </div>

                <div className="grid grid-cols-6 gap-1 text-[11px]">
                  <button
                    onClick={() => snapToFace('front')}
                    className="py-1 px-1.5 bg-slate-800/90 hover:bg-blue-600 hover:text-white text-slate-200 rounded-md font-medium text-center transition cursor-pointer border border-slate-700/60"
                    title="Encaixar na Frente (+Z)"
                  >
                    Frente
                  </button>
                  <button
                    onClick={() => snapToFace('rear')}
                    className="py-1 px-1.5 bg-slate-800/90 hover:bg-amber-600 hover:text-white text-slate-200 rounded-md font-medium text-center transition cursor-pointer border border-slate-700/60"
                    title="Encaixar na Traseira (-Z)"
                  >
                    Traseira
                  </button>
                  <button
                    onClick={() => snapToFace('top')}
                    className="py-1 px-1.5 bg-slate-800/90 hover:bg-emerald-600 hover:text-white text-slate-200 rounded-md font-medium text-center transition cursor-pointer border border-slate-700/60"
                    title="Encaixar no Topo (+Y)"
                  >
                    Topo
                  </button>
                  <button
                    onClick={() => snapToFace('bottom')}
                    className="py-1 px-1.5 bg-slate-800/90 hover:bg-purple-600 hover:text-white text-slate-200 rounded-md font-medium text-center transition cursor-pointer border border-slate-700/60"
                    title="Encaixar na Base (-Y)"
                  >
                    Base
                  </button>
                  <button
                    onClick={() => snapToFace('left')}
                    className="py-1 px-1.5 bg-slate-800/90 hover:bg-cyan-600 hover:text-white text-slate-200 rounded-md font-medium text-center transition cursor-pointer border border-slate-700/60"
                    title="Encaixar na Lateral Esquerda (-X)"
                  >
                    Lat. Esq.
                  </button>
                  <button
                    onClick={() => snapToFace('right')}
                    className="py-1 px-1.5 bg-slate-800/90 hover:bg-cyan-600 hover:text-white text-slate-200 rounded-md font-medium text-center transition cursor-pointer border border-slate-700/60"
                    title="Encaixar na Lateral Direita (+X)"
                  >
                    Lat. Dir.
                  </button>
                </div>
              </div>

              {/* Sliders Precisos de Deslocamento 3D (X, Y e Z) + Redimensionamento de Escala */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                {/* Slider 1 (Horizontal / Tangente 1) */}
                <div className="space-y-1 bg-slate-950/30 p-2 rounded-lg border border-slate-800">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className={`${axisCfg.slider1.color} font-bold`}>{axisCfg.slider1.label}</span>
                    <span className="font-mono text-slate-200">
                      {axisCfg.slider1.value > 0 ? `+${axisCfg.slider1.value}` : axisCfg.slider1.value}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-axisCfg.slider1.max}
                    max={axisCfg.slider1.max}
                    step={0.1}
                    value={axisCfg.slider1.value}
                    onChange={(e) => setOffsetAxis(selectedElementId, axisCfg.slider1.axis, parseFloat(e.target.value))}
                    className={`w-full ${axisCfg.slider1.accent} cursor-pointer`}
                  />
                </div>

                {/* Slider 2 (Vertical / Tangente 2) */}
                <div className="space-y-1 bg-slate-950/30 p-2 rounded-lg border border-slate-800">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className={`${axisCfg.slider2.color} font-bold`}>{axisCfg.slider2.label}</span>
                    <span className="font-mono text-slate-200">
                      {axisCfg.slider2.value > 0 ? `+${axisCfg.slider2.value}` : axisCfg.slider2.value}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-axisCfg.slider2.max}
                    max={axisCfg.slider2.max}
                    step={0.1}
                    value={axisCfg.slider2.value}
                    onChange={(e) => setOffsetAxis(selectedElementId, axisCfg.slider2.axis, parseFloat(e.target.value))}
                    className={`w-full ${axisCfg.slider2.accent} cursor-pointer`}
                  />
                </div>

                {/* Slider 3 (Normal / Elevação / Profundidade) */}
                <div className="space-y-1 bg-slate-950/30 p-2 rounded-lg border border-slate-800">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className={`${axisCfg.slider3.color} font-bold`}>{axisCfg.slider3.label}</span>
                    <span className="font-mono text-slate-200">
                      {axisCfg.slider3.value > 0 ? `+${axisCfg.slider3.value}` : axisCfg.slider3.value}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-axisCfg.slider3.max}
                    max={axisCfg.slider3.max}
                    step={0.1}
                    value={axisCfg.slider3.value}
                    onChange={(e) => setOffsetAxis(selectedElementId, axisCfg.slider3.axis, parseFloat(e.target.value))}
                    className={`w-full ${axisCfg.slider3.accent} cursor-pointer`}
                  />
                </div>

                {/* Slider de Escala / Tamanho do Objeto */}
                <div className="space-y-1 bg-slate-950/30 p-2 rounded-lg border border-emerald-500/30">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-emerald-400 font-bold">Tamanho (Escala):</span>
                    <span className="font-mono text-emerald-300 font-bold">
                      {(currentOffset.scale ?? 1.0).toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.2}
                    max={3.0}
                    step={0.05}
                    value={currentOffset.scale ?? 1.0}
                    onChange={(e) => setElementScale(selectedElementId, parseFloat(e.target.value))}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Rotação 90° e Ações de Reset e Apagar Peça */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px] flex-wrap gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 text-[10px]">Girar 90°:</span>
                  <button
                    onClick={() => rotateElement90('y')}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] transition cursor-pointer"
                    title="Girar 90 graus no eixo Y (Horizontal)"
                  >
                    Y 🔄
                  </button>
                  <button
                    onClick={() => rotateElement90('x')}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] transition cursor-pointer"
                    title="Girar 90 graus no eixo X (Vertical)"
                  >
                    X 🔃
                  </button>
                  <button
                    onClick={() => rotateElement90('z')}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] transition cursor-pointer"
                    title="Girar 90 graus no eixo Z (Roll)"
                  >
                    Z 🔁
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {/* Botão de Apagar Peça Individual */}
                  <button
                    onClick={deleteSelectedElement}
                    className="flex items-center gap-1 px-2.5 py-1 bg-rose-950/70 hover:bg-rose-900 border border-rose-600/60 hover:border-rose-500 text-rose-200 hover:text-white rounded-md transition cursor-pointer text-[10px] font-bold shadow-sm"
                    title="Apagar este objeto ou etiqueta selecionada (Delete/Backspace)"
                  >
                    <Trash2 className="w-3 h-3 text-rose-400" />
                    <span>Apagar Objeto</span>
                  </button>

                  <button
                    onClick={() => resetOffset(selectedElementId)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition cursor-pointer text-[10px]"
                    title="Retorna para a posição e escala padrão"
                  >
                    <RotateCcw className="w-3 h-3 text-amber-400" />
                    <span>Resetar</span>
                  </button>

                  <button
                    onClick={() => selectElementById(null)}
                    className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition cursor-pointer"
                    title="Desmarcar peça (Esc)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-2.5 text-center text-slate-300 text-xs flex flex-col items-center justify-center gap-1">
              <div className="flex items-center gap-1.5">
                <span className="text-amber-400 font-bold">👆 Clique com o botão esquerdo</span>
                <span>em qualquer porta, botão, fonte ou texto para pegar!</span>
              </div>
              <span className="text-[10px] text-slate-400">
                Você pode arrastar as setas 3D coloridas para reposicionar livremente em qualquer direção.
              </span>
            </div>
          )}
        </div>
      )}

      {/* BANNER SUPERIOR: Modo Clique & Escreva Ativo */}
      {viewportMode === 'write' && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-emerald-500/60 text-emerald-200 px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 z-30 text-xs backdrop-blur-md animate-in fade-in slide-in-from-top-2 max-w-xl w-[90%]">
          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
            <Crosshair className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-white text-xs">Modo Clique & Escreva Ativo</div>
            <div className="text-[11px] text-slate-300">
              Clique em qualquer face do roteador (Frente, Trás, Topo ou Laterais) para posicionar e digitar sua frase.
            </div>
          </div>
          <button
            onClick={() => setViewportMode('move')}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold transition cursor-pointer shrink-0"
          >
            Voltar (M)
          </button>
        </div>
      )}

      {/* MODAL FLUTUANTE: Inserir Frase no Ponto Clicado */}
      {writeModalState.isOpen && (
        <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-emerald-500/50 rounded-2xl p-5 max-w-md w-full shadow-2xl shadow-emerald-950/50 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <Type className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">Escrever no Roteador</h3>
                  <div className="text-[10px] text-slate-400">
                    Face Selecionada:{' '}
                    <span className="text-emerald-400 font-bold capitalize">
                      {writeModalState.face === 'front'
                        ? 'Frente (+Z)'
                        : writeModalState.face === 'rear'
                        ? 'Traseira (-Z)'
                        : writeModalState.face === 'top'
                        ? 'Topo (+Y)'
                        : writeModalState.face === 'bottom'
                        ? 'Base (-Y)'
                        : writeModalState.face === 'left'
                        ? 'Lateral Esq. (-X)'
                        : 'Lateral Dir. (+X)'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setWriteModalState((s) => ({ ...s, isOpen: false }))}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Texto input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Texto ou Frase:</label>
              <input
                type="text"
                value={modalText}
                onChange={(e) => setModalText(e.target.value)}
                autoFocus
                placeholder="Ex: CISCO, CONSOLE, MGMT, WAN 1..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirmWriteModal();
                }}
                className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 text-slate-100 rounded-xl px-3 py-2 text-sm outline-none font-mono"
              />
            </div>

            {/* Chips rápidos */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500">Sugestões rápidas:</span>
              <div className="flex flex-wrap gap-1">
                {['CISCO', 'CONSOLE', 'MGMT', 'GigabitEthernet', 'WAN 1', 'LAN 1-4', '10GbE SFP+', 'RESET', '100-240V AC', 'PoE+ 30W'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setModalText(t)}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-300 rounded text-[10px] border border-slate-700/60 transition cursor-pointer"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Estilo */}
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-300">Estilo da Inscrição:</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'silkscreen', name: 'Serigrafia Direta', desc: 'Tinta no metal' },
                  { id: 'badge', name: 'Plaqueta Anodizada', desc: 'Chanfrada com rebites' },
                  { id: 'metallic', name: 'Alumínio Escovado', desc: 'Placa metálica' },
                  { id: 'tape_warning', name: 'Fita de Aviso', desc: 'Amarela com listras' }
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setModalStyle(st.id as TextLabelStyle)}
                    className={`p-2 rounded-xl text-left border transition cursor-pointer ${
                      modalStyle === st.id
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs text-slate-200">{st.name}</div>
                    <div className="text-[9px] text-slate-500">{st.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Cores e Fonte */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-300">Cor do Texto:</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={modalTextColor}
                    onChange={(e) => setModalTextColor(e.target.value)}
                    className="w-7 h-7 rounded border-0 cursor-pointer bg-transparent"
                  />
                  <div className="flex gap-1">
                    {['#ffffff', '#38bdf8', '#eab308', '#22c55e', '#ef4444', '#000000'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setModalTextColor(c)}
                        style={{ backgroundColor: c }}
                        className="w-4 h-4 rounded-full border border-slate-700 cursor-pointer"
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs text-slate-300 font-semibold">
                  <span>Tamanho da Fonte:</span>
                  <span className="font-mono text-emerald-400">{modalFontSize} px</span>
                </div>
                <input
                  type="range"
                  min={32}
                  max={72}
                  step={4}
                  value={modalFontSize}
                  onChange={(e) => setModalFontSize(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setWriteModalState((s) => ({ ...s, isOpen: false }))}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmWriteModal}
                className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition cursor-pointer shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Colocar no Roteador</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dica de navegação rápida inferior */}
      <div className="absolute bottom-3 left-4 text-[11px] text-slate-400 bg-slate-900/80 backdrop-blur px-2.5 py-1 rounded-md border border-slate-800 pointer-events-none z-10">
        💡 <span className="text-slate-300 font-semibold">Botão Esquerdo:</span>{' '}
        {viewportMode === 'move'
          ? 'Selecionar & Arrastar Peças / Textos 3D'
          : viewportMode === 'write'
          ? 'Mirar & Clicar para Escrever na Carcaça'
          : viewportMode === 'paint'
          ? 'Pintar no Modelo 3D'
          : 'Girar Câmera'}{' '}
        | <span className="text-slate-300 font-semibold">Botão Direito / Scroll:</span> Girar e Zoom da Câmera | Atalhos:{' '}
        <kbd className="px-1 bg-slate-800 rounded">M</kbd> Mover, <kbd className="px-1 bg-slate-800 rounded">P</kbd> Pintar,{' '}
        <kbd className="px-1 bg-slate-800 rounded">T</kbd> Escrever
      </div>
    </div>
  );
};
