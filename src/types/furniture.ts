export const furnitureKinds=['Cama','Escrivaninha_com_computador','Comoda','Mesa_cabeceira','Pia','Bancada_cozinha','Privada','Chuveiro','Geladeira','Forno','Mesa_e_cadeiras','Sofa','TV_e_rack','Mesa_centro','Maquina_lavar','Mesa','Cadeira'] as const;
export type FurnitureKind=typeof furnitureKinds[number];
export interface FurnitureInstance {id:string;kind:FurnitureKind;x:number;y:number;z:number;rotation:number;scale:number}
export const furnitureLabel=(kind:string)=>({Comoda:'Cômoda',Sofa:'Sofá',Maquina_lavar:'Máquina de lavar',TV_e_rack:'TV e rack',Escrivaninha_com_computador:'Escrivaninha com computador'}[kind]??kind.replace(/_/g,' '));
