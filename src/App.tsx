import { Canvas, useFrame } from '@react-three/fiber';
import { Sky, Stars } from '@react-three/drei';
import { useState, useMemo } from 'react';
import * as THREE from 'three';
import { useStore } from './hooks/useStore';
import { InstancedCubes } from './components/InstancedCubes';
import { Selection } from './components/Selection';
import { Ground } from './components/Ground';
import { Player } from './components/Player';
import { TextureSelector, Crosshair, Instructions, StartScreen } from './components/UI';

const DayNightSystem = () => {
  const advanceTime = useStore((state) => state.advanceTime);
  const time = useStore((state) => state.time);
  
  useFrame((state, delta) => {
    advanceTime(delta);
  });

  // Calculate sun position and light intensities based on 0-1 time
  // Angle: -PI/2 (midnight) to 3PI/2
  const sunAngle = (time * Math.PI * 2) - (Math.PI / 2);
  const sunPosition = useMemo(() => {
    return new THREE.Vector3(
      Math.cos(sunAngle) * 200,
      Math.sin(sunAngle) * 200,
      Math.cos(sunAngle) * 100 // Slight perspective tilt
    );
  }, [sunAngle]);

  // Scene light intensities
  // Day is roughly top half of sine wave
  const dayFactor = Math.max(0, Math.sin(sunAngle)); 
  const ambientIntensity = 0.2 + dayFactor * 0.8;
  const directionalIntensity = dayFactor * 1.8;

  return (
    <>
      <Sky sunPosition={[sunPosition.x, sunPosition.y, sunPosition.z]} />
      <Stars 
        radius={100} 
        depth={50} 
        count={5000} 
        factor={4} 
        saturation={0} 
        fade 
        speed={1} 
      />
      <ambientLight intensity={ambientIntensity} />
      <directionalLight 
        position={[sunPosition.x, sunPosition.y, sunPosition.z]} 
        intensity={directionalIntensity} 
        castShadow 
        shadow-mapSize={[1024, 1024]} 
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
      />
    </>
  );
};

export default function App() {
  const [isStarted, setIsStarted] = useState(false);

  return (
    <div 
      className="w-full h-screen bg-black overflow-hidden relative font-sans"
      onContextMenu={(e) => e.preventDefault()}
    >
      <Canvas shadows camera={{ fov: 45 }}>
        <DayNightSystem />
        
        <InstancedCubes />
        <Selection />
        <Ground />
        <Player isStarted={isStarted} onUnlock={() => setIsStarted(false)} />
      </Canvas>

      <Crosshair />
      <TextureSelector />
      <Instructions />
      
      {!isStarted && <StartScreen onStart={() => setIsStarted(true)} />}
      
      {/* Actions */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button 
          onClick={() => useStore.getState().resetWorld()}
          className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-red-700 shadow-lg"
        >
          Reset World
        </button>
        <button 
          onClick={() => useStore.getState().saveWorld()}
          className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-green-700 shadow-lg"
        >
          Save World
        </button>
      </div>
    </div>
  );
}
