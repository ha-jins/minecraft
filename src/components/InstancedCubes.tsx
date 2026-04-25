import { useStore } from '../hooks/useStore';
import { useMemo, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { textures } from '../lib/textures';
import { ThreeEvent } from '@react-three/fiber';

const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
const torchGeometry = new THREE.BoxGeometry(0.1, 0.6, 0.1);
torchGeometry.translate(0, -0.2, 0);

// Standard textures mapping
const getMaterials = (texture: string) => {
  let materials: THREE.Texture[] = [];
  switch (texture) {
    case 'grass':
      materials = [textures.grassSide, textures.grassSide, textures.grassTop, textures.dirt, textures.grassSide, textures.grassSide];
      break;
    case 'wood': // Tree Trunk
      materials = [textures.trunkSide, textures.trunkSide, textures.trunkTop, textures.trunkTop, textures.trunkSide, textures.trunkSide];
      break;
    case 'log': // Planks
      materials = Array(6).fill(textures.woodPlanks);
      break;
    case 'glass':
      materials = Array(6).fill(textures.glass);
      break;
    case 'stone':
      materials = Array(6).fill(textures.stone);
      break;
    case 'cobblestone':
      materials = Array(6).fill(textures.cobblestone);
      break;
    case 'sand':
      materials = Array(6).fill(textures.sand);
      break;
    case 'leaves':
      materials = Array(6).fill(textures.leaves);
      break;
    case 'dirt':
      materials = Array(6).fill(textures.dirt);
      break;
    case 'torch':
      materials = Array(6).fill(textures.torch);
      break;
    default:
      materials = Array(6).fill(textures.dirt);
      break;
  }
  return materials.map((map) => (
    new THREE.MeshStandardMaterial({ 
      map, 
      transparent: texture === 'glass' || texture === 'leaves',
      opacity: (texture === 'glass' || texture === 'leaves') ? 0.6 : 1,
      color: '#ffffff', 
    })
  ));
};

// Cache materials to avoid re-creating them
const materialCache: Record<string, THREE.MeshStandardMaterial[]> = {};
const getCachedMaterials = (texture: string) => {
  if (!materialCache[texture]) {
    materialCache[texture] = getMaterials(texture);
  }
  return materialCache[texture];
};

export const InstancedCubes = () => {
  const blocks = useStore((state) => state.blocks);
  const lights = useStore((state) => state.lights);
  const addBlock = useStore((state) => state.addBlock);
  const removeBlock = useStore((state) => state.removeBlock);
  const lastInteractionTime = useRef(0);

  // Group blocks by texture into simple coordinate arrays
  const blocksByTexture = useMemo(() => {
    const groups: Record<string, [number, number, number][]> = {};
    Object.entries(blocks).forEach(([key, texture]) => {
      if (!groups[texture]) groups[texture] = [];
      const pos = key.split(',').map(Number) as [number, number, number];
      groups[texture].push(pos);
    });
    return groups;
  }, [blocks]);

  const handleInteraction = (e: ThreeEvent<PointerEvent>, _texture: string, positions: [number, number, number][]) => {
    e.stopPropagation();
    
    // Check cooldown
    const now = Date.now();
    if (now - lastInteractionTime.current < 150) return;
    lastInteractionTime.current = now;

    const instanceId = e.instanceId;
    if (instanceId === undefined) return;

    const basePos = positions[instanceId];
    if (!basePos) return;

    // Right Click (2) or Alt + Left Click (buttons: 1) -> Add Block
    // In e.buttons: 1 = left, 2 = right
    const isAdd = e.buttons === 2 || (e.buttons === 1 && e.altKey);
    const isRemove = e.buttons === 1 && !e.altKey;

    if (isAdd) {
      if (!e.face) return;
      const { x: nx, y: ny, z: nz } = e.face.normal;
      addBlock(Math.round(basePos[0] + nx), Math.round(basePos[1] + ny), Math.round(basePos[2] + nz));
    } else if (isRemove) {
      removeBlock(Math.round(basePos[0]), Math.round(basePos[1]), Math.round(basePos[2]));
    }
  };

  return (
    <>
      {Object.entries(blocksByTexture).map(([texture, positions]) => (
        <CubeGroup 
          key={texture} 
          texture={texture} 
          positions={positions} 
          lights={lights}
          onInteraction={handleInteraction}
        />
      ))}
    </>
  );
};

interface CubeGroupProps {
  texture: string;
  positions: [number, number, number][];
  lights: Record<string, number>;
  onInteraction: (e: ThreeEvent<PointerEvent>, texture: string, positions: [number, number, number][]) => void;
}

const CubeGroup = ({ texture, positions, lights, onInteraction }: CubeGroupProps) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materials = useMemo(() => getCachedMaterials(texture), [texture]);
  const colorObj = useMemo(() => new THREE.Color(), []);

  useEffect(() => {
    if (!meshRef.current) return;
    
    const tempObject = new THREE.Object3D();
    positions.forEach((pos, i) => {
      tempObject.position.set(pos[0], pos[1], pos[2]);
      tempObject.updateMatrix();
      meshRef.current?.setMatrixAt(i, tempObject.matrix);

      // Apply lighting color
      const lightVal = lights[`${pos[0]},${pos[1]},${pos[2]}`] ?? 8;
      const intensity = lightVal / 10;
      colorObj.setScalar(texture === 'torch' ? 2.0 : intensity);
      meshRef.current?.setColorAt(i, colorObj);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    meshRef.current.count = positions.length;
    meshRef.current.computeBoundingSphere();
    meshRef.current.computeBoundingBox();
  }, [positions, lights, colorObj, texture]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[texture === 'torch' ? torchGeometry : boxGeometry, undefined, 20000]}
      onPointerDown={(e) => onInteraction(e, texture, positions)}
      onPointerMove={(e) => e.buttons > 0 && onInteraction(e, texture, positions)}
      castShadow
      receiveShadow
      frustumCulled={false}
    >
      {materials.map((mat, i) => (
        <primitive object={mat} key={i} attach={`material-${i}`} />
      ))}
    </instancedMesh>
  );
};
