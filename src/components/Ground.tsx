import { useStore } from '../hooks/useStore';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { useRef } from 'react';

export const Ground = () => {
  const addBlock = useStore((state) => state.addBlock);
  const lastInteractionTime = useRef(0);

  const handleInteraction = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    
    const now = Date.now();
    if (now - lastInteractionTime.current < 150) return;
    lastInteractionTime.current = now;

    const { x, z } = e.point;
    const isAdd = e.buttons === 2 || (e.buttons === 1 && e.altKey);
    if (isAdd) {
      addBlock(Math.round(x), 0, Math.round(z));
    }
  };

  return (
    <mesh
      receiveShadow
      name="ground"
      position={[0, -0.01, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerDown={handleInteraction}
      onPointerMove={(e) => e.buttons > 0 && handleInteraction(e)}
    >
      <planeGeometry args={[1000, 1000]} />
      <meshStandardMaterial color="#408030" />
    </mesh>
  );
};
