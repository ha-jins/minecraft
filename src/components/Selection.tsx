import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useState } from 'react';
import * as THREE from 'three';
import { Edges } from '@react-three/drei';

export const Selection = () => {
  const { raycaster, mouse, camera, scene } = useThree();
  const [pos, setPos] = useState<[number, number, number] | null>(null);

  useFrame(() => {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const validTargets = scene.children.filter(obj => 
      obj.type === 'InstancedMesh' || obj.name === 'ground'
    );
    const intersects = raycaster.intersectObjects(validTargets, true);
    const filtered = intersects[0];
    
    if (filtered) {
      if (filtered.object.type === 'InstancedMesh') {
        const instanceId = filtered.instanceId;
        if (instanceId !== undefined) {
          const mesh = filtered.object as THREE.InstancedMesh;
          const matrix = new THREE.Matrix4();
          mesh.getMatrixAt(instanceId, matrix);
          const position = new THREE.Vector3();
          position.setFromMatrixPosition(matrix);
          setPos([Math.round(position.x), Math.round(position.y), Math.round(position.z)]);
        } else {
          setPos(null);
        }
      } else {
        // Ground highlight
        const { x, z } = filtered.point;
        setPos([Math.round(x), 0, Math.round(z)]);
      }
    } else {
      setPos(null);
    }
  });

  if (!pos) return null;

  return (
    <mesh position={pos} raycast={() => null}>
      <boxGeometry args={[1.02, 1.02, 1.02]} />
      <meshBasicMaterial transparent opacity={0} />
      <Edges color="white" lineWidth={3} />
      <Edges color="yellow" lineWidth={1.5} />
    </mesh>
  );
};
