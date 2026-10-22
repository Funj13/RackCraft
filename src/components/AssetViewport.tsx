import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {TransformControls} from 'three/addons/controls/TransformControls.js';
import { disposeModel } from '../generator/RoomBuilder';

/** Shared centimeter-scale viewer for procedural assets. Owns the supplied model. */
export interface FurnitureSelection {id:string;roomId:string;floor:number}
export function AssetViewport({ model, focusKey = 'asset', focusBounds,selectedFurniture,onSelectFurniture,onMoveFurniture }: {
  model: THREE.Group; focusKey?: string;
  focusBounds?:{minX:number;maxX:number;minY:number;maxY:number;minZ:number;maxZ:number};
  selectedFurniture?:FurnitureSelection;
  onSelectFurniture?:(selection:FurnitureSelection)=>void;
  onMoveFurniture?:(selection:FurnitureSelection,position:{x:number;y:number;z:number})=>boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState(0);
  const lastFrame = useRef(0);
  const lastFocus = useRef(focusKey);
  const sceneRef = useRef<THREE.Scene | undefined>(undefined);
  const interactions=useRef({onSelectFurniture,onMoveFurniture});interactions.current={onSelectFurniture,onMoveFurniture};
  const view = useRef<{ camera: THREE.PerspectiveCamera; controls: OrbitControls; sun:THREE.DirectionalLight; gizmo:TransformControls; outline:THREE.BoxHelper; fitted: boolean } | undefined>(undefined);
  useEffect(() => {
    const host = container.current!;
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#0b1220'); sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(45, 1, 1, 30000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=0.95;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.maxDistance = 15000; controls.minDistance = 20;
    scene.add(new THREE.HemisphereLight('#ffffff', '#64748b', 1.2));
    const light = new THREE.DirectionalLight('#fff1dc', 2); light.position.set(500, 1000, 800);scene.add(light,light.target);
    light.castShadow=true;light.shadow.mapSize.set(2048,2048);light.shadow.normalBias=0.4;light.shadow.bias=-0.00025;
    const gizmo=new TransformControls(camera,renderer.domElement);gizmo.setMode('translate');gizmo.setSpace('world');gizmo.size=0.85;scene.add(gizmo.getHelper());
    const outline=new THREE.BoxHelper(new THREE.Object3D(),0x38bdf8);outline.visible=false;scene.add(outline);
    let initial:THREE.Vector3|undefined;
    const selection=(object:THREE.Object3D):FurnitureSelection=>({id:object.userData.id,roomId:object.userData.roomId,floor:object.userData.floor});
    gizmo.addEventListener('dragging-changed',event=>{
      controls.enabled=!event.value;
      const object=gizmo.object;if(!object)return;
      if(event.value)initial=object.position.clone();
      else if(initial){
        const accepted=interactions.current.onMoveFurniture?.(selection(object),{x:object.position.x,y:object.position.y,z:object.position.z});
        if(accepted===false)object.position.copy(initial);initial=undefined;
      }
    });
    const raycaster=new THREE.Raycaster();let down={x:0,y:0};
    const pointerDown=(e:PointerEvent)=>{down={x:e.clientX,y:e.clientY};};
    const pointerUp=(e:PointerEvent)=>{
      if(!interactions.current.onSelectFurniture || e.button!==0 || gizmo.axis!==null || Math.hypot(e.clientX-down.x,e.clientY-down.y)>4)return;
      const rect=renderer.domElement.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);
      const target=scene.children.find(o=>o.userData.houseModel);
      if(!target)return;
      for(const hit of raycaster.intersectObject(target,true)){
        let object:THREE.Object3D|null=hit.object;
        while(object && !object.userData.furniture)object=object.parent;
        if(object?.userData.id){interactions.current.onSelectFurniture(selection(object));return;}
        // Do not select through an opaque wall or another architectural surface.
        const mesh=hit.object as THREE.Mesh;const mat=Array.isArray(mesh.material)?mesh.material[0]:mesh.material;
        if(!(mat instanceof THREE.MeshPhysicalMaterial && mat.transmission>0.5))return;
      }
    };
    renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointerup',pointerUp);
    view.current = { camera, controls, sun:light,gizmo,outline, fitted: false };
    const fill = new THREE.DirectionalLight('#b1d4ff', 0.5); fill.position.set(-500, 600, -500); scene.add(fill);
    const grid = new THREE.GridHelper(4000, 80, '#334155', '#182538'); grid.position.y = -41; scene.add(grid);
    const observer = new ResizeObserver(() => {
      const w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h); camera.aspect = w/h; camera.updateProjectionMatrix();
    }); observer.observe(host);
    renderer.setAnimationLoop(() => {
      if (!host.clientWidth || !host.clientHeight) return;
      controls.update();if(gizmo.object)outline.setFromObject(gizmo.object);renderer.render(scene, camera);
    });
    return () => {
      renderer.setAnimationLoop(null); observer.disconnect(); controls.dispose();
      renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointerup',pointerUp);
      gizmo.dispose();outline.geometry.dispose();(outline.material as THREE.Material).dispose();
      grid.geometry.dispose(); (grid.material as THREE.Material).dispose();
      renderer.dispose(); host.removeChild(renderer.domElement); sceneRef.current = undefined; view.current = undefined;
      light.shadow.map?.dispose();
    };
  }, []);
  useEffect(() => {
    const scene = sceneRef.current!;
    model.userData.houseModel=true;scene.add(model);
    return () => {view.current?.gizmo.detach();scene.remove(model); disposeModel(model);};
  }, [model]);
  useEffect(()=>{
    const v=view.current;if(!v)return;
    let target:THREE.Object3D|undefined;
    if(selectedFurniture)model.traverse(o=>{if(o.userData.furniture && o.userData.id===selectedFurniture.id && o.userData.roomId===selectedFurniture.roomId && o.userData.floor===selectedFurniture.floor)target=o;});
    if(target){v.gizmo.attach(target);v.outline.setFromObject(target);v.outline.visible=true;}
    else {v.gizmo.detach();v.outline.visible=false;}
  },[model,selectedFurniture]);
  useEffect(() => {
    const v = view.current!;
    const modelBounds = new THREE.Box3().setFromObject(model);
    const center = modelBounds.getCenter(new THREE.Vector3());
    const size = modelBounds.getSize(new THREE.Vector3());
    const extent=Math.max(size.x,size.y,size.z)*0.75;
    v.sun.position.copy(center).add(new THREE.Vector3(extent,extent*2,extent));v.sun.target.position.copy(center);
    const shadow=v.sun.shadow.camera;shadow.left=-extent;shadow.right=extent;shadow.top=extent;shadow.bottom=-extent;shadow.near=1;shadow.far=extent*6;shadow.updateProjectionMatrix();
    if (!v.fitted || lastFrame.current !== frame || lastFocus.current !== focusKey) {
      const targetBounds=focusBounds ? new THREE.Box3(new THREE.Vector3(focusBounds.minX,focusBounds.minY,focusBounds.minZ),new THREE.Vector3(focusBounds.maxX,focusBounds.maxY,focusBounds.maxZ)) : modelBounds;
      const target=targetBounds.getCenter(new THREE.Vector3()),targetSize=targetBounds.getSize(new THREE.Vector3());
      const distance = Math.max(targetSize.x,targetSize.y,targetSize.z) * 1.6 / Math.min(1, v.camera.aspect);
      v.controls.target.copy(target);
      v.camera.position.copy(target).add(new THREE.Vector3(distance, distance * 0.8, distance));
      v.controls.update(); v.fitted = true; lastFrame.current = frame;
      lastFocus.current = focusKey;
    }
  }, [model, frame, focusKey, focusBounds]);
  return <div className="relative h-full w-full min-h-0"><div ref={container} className="h-full w-full" aria-label="Visualização 3D do ambiente" />
    <button className="absolute top-4 right-4 rounded-lg bg-slate-800 px-3 py-2 text-xs" onClick={() => setFrame(v => v+1)}>Enquadrar modelo</button>
  </div>;
}
