import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import { useRef, useMemo, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useKeyboard } from '../hooks/useKeyboard';
import { useStore, playerPhysicalPos, worldGrid } from '../hooks/useStore';
import { textures } from '../lib/textures';

export const Player = ({ isStarted, onUnlock }: { isStarted: boolean; onUnlock: () => void }) => {
  const { camera, raycaster, scene } = useThree();
  const controlsRef = useRef<any>(null);
  const { forward, backward, left, right, jump, toggleView, leftClick, rightClick } = useKeyboard();
  const addBlock = useStore((state) => state.addBlock);
  const removeBlock = useStore((state) => state.removeBlock);
  
  const lastInteractionTime = useRef(0);
  const interactionCooldown = 150; // ms between actions (faster feel)

  // View mode: 0 = First Person, 1 = Third Person Back, 2 = Third Person Front
  const [viewMode, setViewMode] = useState(0);
  
  // Actual physical position of the player (feet)
  const playerPos = useRef(new THREE.Vector3(0, 5, 0));
  const velocity = useRef(new THREE.Vector3(0, 0, 0));
  const playerModelRotation = useRef(0);
  
  const moveSpeed = 4.0;
  const gravity = 20.0;
  const jumpForce = 7.1;
  const playerHeight = 1.7;

  // Auto-lock when started
  useEffect(() => {
    if (isStarted && controlsRef.current) {
      // Small delay to prevent "immediate re-lock" error
      const timeout = setTimeout(() => {
        controlsRef.current.lock();
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [isStarted]);

  // Toggle view state
  useEffect(() => {
    if (toggleView) {
      setViewMode((v) => (v + 1) % 3);
    }
  }, [toggleView]);

  // Animation state
  const walkCycle = useRef(0);
  const playerRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    // 0. Update Camera even when not started to avoid black screens or ground views
    if (!isStarted) {
      const eyeLevel = playerPos.current.y + playerHeight;
      camera.position.set(playerPos.current.x, eyeLevel, playerPos.current.z + 0.1);
      camera.lookAt(playerPos.current.x, eyeLevel, playerPos.current.z - 1);
      return;
    }

    // 1. Horizontal Movement Vectors
    const forwardV = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forwardV.y = 0;
    forwardV.normalize();
    
    const rightV = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    rightV.y = 0;
    rightV.normalize();

    const moveDir = new THREE.Vector3()
      .addScaledVector(forwardV, Number(forward) - Number(backward))
      .addScaledVector(rightV, Number(right) - Number(left));

    if (moveDir.length() > 0) moveDir.normalize();

    // 2. Collision Resolution Helper
    const resolveCollision = (pos: THREE.Vector3, axis: 'x' | 'y' | 'z', dir: number) => {
      const pR = 0.3; // Player radius
      const pTop = 1.7; // Head height
      
      let collided = false;
      let hitFloor = false;
      let hitCeiling = false;

      // GRID-BASED COLLISION: Check only blocks around the player
      const minX = Math.floor(pos.x - 0.8);
      const maxX = Math.ceil(pos.x + 0.8);
      const minY = Math.floor(pos.y - 0.5);
      const maxY = Math.ceil(pos.y + 2.2);
      const minZ = Math.floor(pos.z - 0.8);
      const maxZ = Math.ceil(pos.z + 0.8);

      for (let bx = minX; bx <= maxX; bx++) {
        for (let by = minY; by <= maxY; by++) {
          for (let bz = minZ; bz <= maxZ; bz++) {
            if (worldGrid[`${bx},${by},${bz}`]) {
              const dx = Math.abs(pos.x - bx);
              const dz = Math.abs(pos.z - bz);

              // AABB overlap check
              const isOverlapping = 
                dx < (0.5 + pR) && 
                dz < (0.5 + pR) && 
                (pos.y + pTop > by - 0.5 && pos.y < by + 0.5);

              if (isOverlapping) {
                collided = true;
                if (axis === 'x') {
                  const overlapX = (0.5 + pR) - dx;
                  pos.x += pos.x > bx ? overlapX : -overlapX;
                } else if (axis === 'z') {
                  const overlapZ = (0.5 + pR) - dz;
                  pos.z += pos.z > bz ? overlapZ : -overlapZ;
                } else if (axis === 'y') {
                  if (pos.y + (pTop / 2) > by) {
                    pos.y = by + 0.5;
                    hitFloor = true;
                  } else {
                    pos.y = by - 0.5 - pTop;
                    hitCeiling = true;
                  }
                }
              }
            }
          }
        }
      }
      return { collided, hitFloor, hitCeiling };
    };

    // 2.5 Clamp delta to avoid "tunneling" or massive snaps during lag
    const dt = Math.min(delta, 0.1); 

    // 3. Apply Horizontal Movement (Axis-by-Axis)
    const deltaX = moveDir.x * moveSpeed * dt;
    if (Math.abs(deltaX) > 0) {
      playerPos.current.x += deltaX;
      resolveCollision(playerPos.current, 'x', deltaX);
    } else {
      // Even if not moving, resolve x-collision (in case a block was placed inside us)
      resolveCollision(playerPos.current, 'x', 0);
    }

    const deltaZ = moveDir.z * moveSpeed * dt;
    if (Math.abs(deltaZ) > 0) {
      playerPos.current.z += deltaZ;
      resolveCollision(playerPos.current, 'z', deltaZ);
    } else {
      resolveCollision(playerPos.current, 'z', 0);
    }

    // 4. Apply Vertical Movement (Gravity & Jump)
    velocity.current.y -= gravity * dt;
    const deltaY = velocity.current.y * dt;
    playerPos.current.y += deltaY;
    
    if (playerPos.current.y < -30) {
      playerPos.current.y = 20;
      velocity.current.y = 0;
    }

    const resY = resolveCollision(playerPos.current, 'y', deltaY);
    if (resY.collided) {
      if (resY.hitFloor) {
        const isMovingDown = velocity.current.y <= 0.01;
        if (isMovingDown) {
          velocity.current.y = 0;
          if (jump) {
            velocity.current.y = jumpForce;
          }
        }
      } else if (resY.hitCeiling) {
        if (velocity.current.y > 0) {
          velocity.current.y = 0;
        }
      }
    }

    // 5. Update Rotation and Animation
    if (moveDir.length() > 0) {
      walkCycle.current += delta * 12;
      if (viewMode !== 0) {
        playerModelRotation.current = Math.atan2(moveDir.x, moveDir.z);
      }
    } else {
      walkCycle.current = 0;
      if (viewMode === 0) playerModelRotation.current = camera.rotation.y;
    }

    // Update global reference for block placement validation
    playerPhysicalPos.x = playerPos.current.x;
    playerPhysicalPos.y = playerPos.current.y;
    playerPhysicalPos.z = playerPos.current.z;

    // 6. Camera & Model Updates
    const eyeLevel = playerPos.current.y + playerHeight;
    if (viewMode === 0) {
      camera.position.copy(playerPos.current).setY(eyeLevel);
    } else {
      const offsetDistance = viewMode === 1 ? 4 : -4;
      const horizontalRotation = new THREE.Euler(0, camera.rotation.y, 0);
      const cameraOffset = new THREE.Vector3(0, 0.5, offsetDistance).applyEuler(horizontalRotation);
      camera.position.copy(playerPos.current).setY(eyeLevel + 0.5).add(cameraOffset);
    }

    if (playerRef.current) {
      playerRef.current.position.copy(playerPos.current);
      playerRef.current.rotation.y = playerModelRotation.current;
      playerRef.current.visible = viewMode !== 0;
    }
  });

  const armRotation = Math.sin(walkCycle.current) * 0.5;
  const legRotation = Math.cos(walkCycle.current) * 0.5;

  return (
    <>
      <PointerLockControls ref={controlsRef} onUnlock={onUnlock} />
      <group ref={playerRef} userData={{ isPlayer: true }}>
        {/* Torso */}
        <mesh position={[0, 1.15, 0]}>
          <boxGeometry args={[0.4, 0.6, 0.2]} />
          <meshStandardMaterial map={textures.playerShirt} />
        </mesh>
        
        {/* Head & Features */}
        <group position={[0, 1.45, 0]}>
          {/* Main Head (Skin) */}
          <mesh>
            <boxGeometry args={[0.4, 0.4, 0.4]} />
            <meshStandardMaterial map={textures.playerSkin} />
          </mesh>
          
          {/* Hair - Top/Main (Shifted back to reveal face) */}
          <mesh position={[0, 0.05, -0.05]}>
            <boxGeometry args={[0.42, 0.42, 0.35]} />
            <meshStandardMaterial map={textures.playerHair} />
          </mesh>

          {/* Red Hair Highlights (Sides - Adjusted) */}
          <mesh position={[0.21, -0.05, -0.05]}>
            <boxGeometry args={[0.02, 0.45, 0.35]} />
            <meshStandardMaterial map={textures.playerHairHighlight} />
          </mesh>
          <mesh position={[-0.21, -0.05, -0.05]}>
            <boxGeometry args={[0.02, 0.45, 0.35]} />
            <meshStandardMaterial map={textures.playerHairHighlight} />
          </mesh>

          {/* Bangs (Front hair - trimmed to not hide eyes) */}
          <mesh position={[0, 0.18, 0.15]}>
            <boxGeometry args={[0.42, 0.1, 0.12]} />
            <meshStandardMaterial map={textures.playerHair} />
          </mesh>

          {/* Long Hair Back */}
          <mesh position={[0, -0.3, -0.21]}>
            <boxGeometry args={[0.42, 0.6, 0.02]} />
            <meshStandardMaterial map={textures.playerHair} />
          </mesh>

          {/* Cat Ears */}
          <group position={[0.15, 0.25, -0.05]} rotation={[0, 0, 0.5]}>
            <mesh>
              <boxGeometry args={[0.15, 0.15, 0.1]} />
              <meshStandardMaterial map={textures.playerHair} />
            </mesh>
            <mesh position={[0, 0, 0.06]}>
              <boxGeometry args={[0.1, 0.1, 0.02]} />
              <meshStandardMaterial color="#ffcdd2" /> {/* Inner ear pink */}
            </mesh>
          </group>
          <group position={[-0.15, 0.25, -0.05]} rotation={[0, 0, -0.5]}>
            <mesh>
              <boxGeometry args={[0.15, 0.15, 0.1]} />
              <meshStandardMaterial map={textures.playerHair} />
            </mesh>
            <mesh position={[0, 0, 0.06]}>
              <boxGeometry args={[0.1, 0.1, 0.02]} />
              <meshStandardMaterial color="#ffcdd2" />
            </mesh>
          </group>

          {/* Ahoge (Antenna) */}
          <mesh position={[0, 0.35, -0.05]} rotation={[-0.2, 0.1, 0]}>
            <boxGeometry args={[0.05, 0.2, 0.05]} />
            <meshStandardMaterial map={textures.playerAntenna} />
          </mesh>

          {/* Face Details */}
          <group position={[0, -0.05, 0.2]}>
            {/* Eyes */}
            <mesh position={[0.1, 0.05, 0.01]}>
              <boxGeometry args={[0.1, 0.12, 0.01]} />
              <meshStandardMaterial color="#1a1a1a" />
            </mesh>
            <mesh position={[-0.1, 0.05, 0.01]}>
              <boxGeometry args={[0.1, 0.12, 0.01]} />
              <meshStandardMaterial color="#1a1a1a" />
            </mesh>

            {/* Blush */}
            <mesh position={[0.13, -0.05, 0.01]}>
              <boxGeometry args={[0.1, 0.05, 0.01]} />
              <meshStandardMaterial color="#ff80ab" transparent opacity={0.6} />
            </mesh>
            <mesh position={[-0.13, -0.05, 0.01]}>
              <boxGeometry args={[0.1, 0.05, 0.01]} />
              <meshStandardMaterial color="#ff80ab" transparent opacity={0.6} />
            </mesh>

            {/* Small Cute Mouth */}
            <mesh position={[0, -0.08, 0.01]}>
              <boxGeometry args={[0.06, 0.02, 0.01]} />
              <meshStandardMaterial color="#cc3333" />
            </mesh>
          </group>
        </group>

        {/* Left Arm */}
        <group position={[-0.3, 1.35, 0]} rotation={[armRotation, 0, 0]}>
          <mesh position={[0, -0.2, 0]}>
            <boxGeometry args={[0.2, 0.6, 0.2]} />
            <meshStandardMaterial map={textures.playerShirt} />
          </mesh>
        </group>

        {/* Right Arm */}
        <group position={[0.3, 1.35, 0]} rotation={[-armRotation, 0, 0]}>
          <mesh position={[0, -0.2, 0]}>
            <boxGeometry args={[0.2, 0.6, 0.2]} />
            <meshStandardMaterial map={textures.playerShirt} />
          </mesh>
        </group>

        {/* Left Leg */}
        <group position={[-0.1, 0.85, 0]} rotation={[-legRotation, 0, 0]}>
          <mesh position={[0, -0.4, 0]}>
            <boxGeometry args={[0.2, 0.9, 0.2]} />
            <meshStandardMaterial map={textures.playerPants} />
          </mesh>
        </group>

        {/* Right Leg */}
        <group position={[0.1, 0.85, 0]} rotation={[legRotation, 0, 0]}>
          <mesh position={[0, -0.4, 0]}>
            <boxGeometry args={[0.2, 0.9, 0.2]} />
            <meshStandardMaterial map={textures.playerPants} />
          </mesh>
        </group>
      </group>
    </>
  );
};
