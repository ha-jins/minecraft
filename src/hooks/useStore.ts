import { nanoid } from 'nanoid';
import { create } from 'zustand';

// Global non-reactive player position for collision checks during block placement
export const playerPhysicalPos = { x: 0, y: 5, z: 0 };

// Use a non-reactive grid for high-speed collision lookups
// This is synced with the Zustand store
export const worldGrid: Record<string, string> = {};

interface GameState {
  texture: string;
  blocks: Record<string, string>; // Key: "x,y,z", Value: texture
  lights: Record<string, number>; // Key: "x,y,z", Value: brightness [0-10]
  torchContributions: Record<string, number>; // Precomputed torch light summed [0-7]
  time: number; // 0.0 to 1.0 (Full day cycle)
  addBlock: (x: number, y: number, z: number) => void;
  removeBlock: (x: number, y: number, z: number) => void;
  setTexture: (texture: string) => void;
  advanceTime: (delta: number) => void;
  saveWorld: () => void;
  resetWorld: () => void;
}

const SUNLIGHT_MAX = 10;
const NIGHT_SUNLIGHT = 1.5; // Faint moonlight

const calculateTorchContributions = (blocks: Record<string, string>) => {
  const contributions: Record<string, number> = {};
  const torches: {x: number, y: number, z: number}[] = [];

  Object.entries(blocks).forEach(([key, texture]) => {
    if (texture === 'torch') {
      const [x, y, z] = key.split(',').map(Number);
      torches.push({x, y, z});
    }
  });

  Object.keys(blocks).forEach((key) => {
    const [bx, by, bz] = key.split(',').map(Number);
    let torchSum = 0;

    torches.forEach(t => {
      const dist = Math.abs(bx - t.x) + Math.abs(by - t.y) + Math.abs(bz - t.z);
      if (dist <= 6) {
        torchSum += (7 - dist);
      }
    });

    contributions[key] = Math.min(7, torchSum);
  });

  return contributions;
};

const getSunlightLevel = (time: number) => {
  // Use a modified sine wave to give longer day/night plateaus
  // time 0.0 is midnight. 0.25 sunrise, 0.5 noon, 0.75 sunset.
  const angle = (time * Math.PI * 2) - (Math.PI / 2); // Shift so 0.0 is midnight (min sine)
  const raw = (Math.sin(angle) + 1) / 2; // 0..1 range
  
  // Power it to sharpen transitions
  const smooth = Math.pow(raw, 0.8);
  
  const level = NIGHT_SUNLIGHT + (SUNLIGHT_MAX - NIGHT_SUNLIGHT) * smooth;
  return Number(level.toFixed(2));
};

const calculateLighting = (blocks: Record<string, string>, torchContribs: Record<string, number>, sunlight: number) => {
  const lights: Record<string, number> = {};
  
  Object.keys(blocks).forEach((key) => {
    const torchContrib = torchContribs[key] ?? 0;
    const combined = sunlight + torchContrib;
    const total = Math.min(10, combined);
    lights[key] = Math.max(sunlight, total);
  });

  return lights;
};

const getLocalStorage = (key: string) => JSON.parse(window.localStorage.getItem(key) || 'null');
const setLocalStorage = (key: string, value: any) => window.localStorage.setItem(key, JSON.stringify(value));

const generateInitialBlocks = () => {
  const initialBlocks: Record<string, string> = {};
  // Ground (expanded to -50..50)
  for (let x = -50; x <= 50; x++) {
    for (let z = -50; z <= 50; z++) {
      initialBlocks[`${x},0,${z}`] = 'grass';
    }
  }

  // House Structure
  const pillars = [
    { x: 2, z: -7 }, { x: 6, z: -7 },
    { x: 2, z: -3 }, { x: 6, z: -3 }
  ];
  
  for (const p of pillars) {
    for (let y = 1; y <= 3; y++) {
      initialBlocks[`${p.x},${y},${p.z}`] = 'wood';
    }
  }

  for (let y = 1; y <= 3; y++) {
    for (let x = 2; x <= 6; x++) {
      for (let z = -7; z <= -3; z++) {
        const isCorner = (x === 2 || x === 6) && (z === -7 || z === -3);
        const isEdge = x === 2 || x === 6 || z === -7 || z === -3;
        
        if (isEdge && !isCorner) {
          if (x === 4 && z === -3 && (y === 1 || y === 2)) continue;
          if (y === 2 && ((x === 2 || x === 6) && z === -5)) {
             initialBlocks[`${x},${y},${z}`] = 'glass';
          } else if (y === 2 && (z === -7 && x === 4)) {
             initialBlocks[`${x},${y},${z}`] = 'glass';
          } else {
             initialBlocks[`${x},${y},${z}`] = 'log';
          }
        }
      }
    }
  }

  for (let x = 2; x <= 6; x++) {
    for (let z = -7; z <= -3; z++) {
      initialBlocks[`${x},4,${z}`] = 'log';
    }
  }

  return initialBlocks;
};

const savedBlocks = getLocalStorage('blocks');
const initialData = (savedBlocks && Object.keys(savedBlocks).length > 0) ? savedBlocks : generateInitialBlocks();

// Initial precomputation
const initialTorchContribs = calculateTorchContributions(initialData);
const initialSunlight = getSunlightLevel(0.35); // Start at morning

// Initial sync
Object.assign(worldGrid, initialData);

export const useStore = create<GameState>((set) => ({
  texture: 'grass',
  blocks: initialData,
  torchContributions: initialTorchContribs,
  lights: calculateLighting(initialData, initialTorchContribs, initialSunlight),
  time: 0.35, // Start at morning
  addBlock: (x, y, z) => {
    set((prev) => {
      const key = `${x},${y},${z}`;
      if (prev.blocks[key]) return prev;

      const px = playerPhysicalPos.x;
      const py = playerPhysicalPos.y;
      const pz = playerPhysicalPos.z;
      const pR = 0.25;
      const pHeight = 1.7;

      const dx = Math.abs(px - x);
      const dz = Math.abs(pz - z);
      const isOverlappingX = dx < (0.5 + pR);
      const isOverlappingZ = dz < (0.5 + pR);
      const isOverlappingY = (py + pHeight > y - 0.45 && py < y + 0.45);

      if (isOverlappingX && isOverlappingZ && isOverlappingY) return prev;

      const newBlocks = { ...prev.blocks, [key]: prev.texture };
      worldGrid[key] = prev.texture;
      
      const newTorchContribs = calculateTorchContributions(newBlocks);
      const sunlight = getSunlightLevel(prev.time);
      const newLights = calculateLighting(newBlocks, newTorchContribs, sunlight);
      
      return { 
        blocks: newBlocks, 
        torchContributions: newTorchContribs,
        lights: newLights 
      };
    });
  },
  removeBlock: (x, y, z) => {
    set((prev) => {
      const key = `${x},${y},${z}`;
      const { [key]: _, ...newBlocks } = prev.blocks;
      delete worldGrid[key];
      
      const newTorchContribs = calculateTorchContributions(newBlocks);
      const sunlight = getSunlightLevel(prev.time);
      const newLights = calculateLighting(newBlocks, newTorchContribs, sunlight);
      
      return { 
        blocks: newBlocks, 
        torchContributions: newTorchContribs,
        lights: newLights 
      };
    });
  },
  setTexture: (texture) => set(() => ({ texture })),
  advanceTime: (delta) => {
    set((prev) => {
      const CYCLE_DURATION = 24 * 60; // 24 minutes in seconds
      const newTime = (prev.time + (delta / CYCLE_DURATION)) % 1;
      
      // Determine if lighting needs recalculating (throttle to avoid per-frame heavy loops)
      const oldSun = getSunlightLevel(prev.time);
      const newSun = getSunlightLevel(newTime);
      
      // Update lights only if sun level changes slightly or every ~10 seconds of game time
      // But actually, we want smooth appearance. 
      // To keep it smooth without lag, we only update 'lights' state if sun level changes by > 0.1
      if (Math.abs(newSun - oldSun) > 0.1) {
        const newLights = calculateLighting(prev.blocks, prev.torchContributions, newSun);
        return { time: newTime, lights: newLights };
      }
      
      return { time: newTime };
    });
  },
  saveWorld: () => {
    set((prev) => {
      setLocalStorage('blocks', prev.blocks);
      return prev;
    });
  },
  resetWorld: () => {
    window.localStorage.removeItem('blocks');
    const resetData = generateInitialBlocks();
    // Clear and sync grid
    Object.keys(worldGrid).forEach(k => delete worldGrid[k]);
    Object.assign(worldGrid, resetData);
    
    const torchContribs = calculateTorchContributions(resetData);
    const sunlight = getSunlightLevel(0.35);
    set(() => ({ 
      blocks: resetData, 
      torchContributions: torchContribs,
      lights: calculateLighting(resetData, torchContribs, sunlight),
      time: 0.35
    }));
  },
}));
