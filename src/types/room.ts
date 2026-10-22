export interface RoomConfig {
  name: string;
  width: number;
  depth: number;
  height: number;
  wallThickness: number;
  floorThickness: number;
  ceiling: boolean;
  walls: Record<'front' | 'back' | 'left' | 'right', boolean>;
  door: { enabled: boolean; width: number; height: number; open: boolean };
  window: { enabled: boolean; width: number; height: number; sill: number };
  colors: { wall: string; floor: string; ceiling: string; trim: string; door: string; glass: string };
}

export const defaultRoom: RoomConfig = {
  name: 'Quarto_LowPoly', width: 450, depth: 350, height: 280,
  wallThickness: 15, floorThickness: 12, ceiling: true,
  walls: { front: true, back: true, left: true, right: true },
  door: { enabled: true, width: 90, height: 210, open: false },
  window: { enabled: true, width: 140, height: 110, sill: 100 },
  colors: { wall: '#d8d5cf', floor: '#a57850', ceiling: '#f2eee8', trim: '#eee9df', door: '#74523c', glass: '#8fc9df' }
};

export const roomLimits = {
  width: [200, 2000], depth: [200, 2000], height: [220, 600],
  wallThickness: [5, 40], floorThickness: [5, 40]
} as const;

export function validateRoom(value: unknown): RoomConfig {
  const c = value as RoomConfig;
  if (!c || typeof c.name !== 'string' || !c.name.trim() || c.name.length > 100) throw new Error('Nome inválido');
  for (const [key, [min, max]] of Object.entries(roomLimits)) {
    const n = c[key as keyof typeof roomLimits];
    if (typeof n !== 'number' || !Number.isFinite(n) || n < min || n > max) throw new Error(`Dimensão inválida: ${key}`);
  }
  for (const side of ['front', 'back', 'left', 'right'] as const) {
    if (typeof c.walls?.[side] !== 'boolean') throw new Error('Paredes inválidas');
  }
  if (typeof c.ceiling !== 'boolean' || typeof c.door?.enabled !== 'boolean' || typeof c.door?.open !== 'boolean' || typeof c.window?.enabled !== 'boolean') throw new Error('Aberturas inválidas');
  const check = (n: number, min: number, max: number) => {
    if (!Number.isFinite(n) || n < min || n > max) throw new Error('Dimensões de abertura inválidas');
  };
  check(c.door.width, 60, c.width - 40); check(c.door.height, 180, c.height - 10);
  check(c.window.width, 40, c.width - 40); check(c.window.height, 40, c.height - 40);
  check(c.window.sill, 20, c.height - c.window.height - 10);
  for (const key of Object.keys(defaultRoom.colors) as (keyof RoomConfig['colors'])[]) {
    if (!/^#[0-9a-f]{6}$/i.test(c.colors?.[key])) throw new Error('Cor inválida');
  }
  return structuredClone(c);
}

export function fitRoom(c: RoomConfig): RoomConfig {
  return { ...c, door: { ...c.door, width: Math.min(c.door.width, c.width - 40), height: Math.min(c.door.height, c.height - 10) },
    window: { ...c.window, width: Math.min(c.window.width, c.width - 40), height: Math.min(c.window.height, c.height - 40),
      sill: Math.min(c.window.sill, c.height - Math.min(c.window.height, c.height - 40) - 10) } };
}
