import { useEffect, useState } from 'react';
import { useStore } from '../hooks/useStore';
import { useKeyboard } from '../hooks/useKeyboard';

const images = {
  grass: '草',
  glass: 'ガラス',
  wood: '原木',
  log: '木材',
  stone: '石',
  dirt: '土',
  cobblestone: '丸石',
  sand: '砂',
  leaves: '葉っぱ',
  torch: '松明',
};

export const TextureSelector = () => {
  const activeTexture = useStore((state) => state.texture);
  const setTexture = useStore((state) => state.setTexture);
  const { dirt, grass, glass, wood, log, stone, cobblestone, sand, leaves, torch } = useKeyboard();

  useEffect(() => {
    const textures = { dirt, grass, glass, wood, log, stone, cobblestone, sand, leaves, torch };
    const pressedTexture = Object.entries(textures).find(([k, v]) => v);
    if (pressedTexture) {
      setTexture(pressedTexture[0]);
    }
  }, [dirt, grass, glass, wood, log, stone, cobblestone, sand, leaves, torch, setTexture]);

  useEffect(() => {
    const textureList = Object.keys(images);
    
    const handleWheel = (e: WheelEvent) => {
      const currentIndex = textureList.indexOf(activeTexture);
      let nextIndex;
      
      if (e.deltaY > 0) {
        nextIndex = (currentIndex + 1) % textureList.length;
      } else {
        nextIndex = (currentIndex - 1 + textureList.length) % textureList.length;
      }
      
      setTexture(textureList[nextIndex]);
    };

    window.addEventListener('wheel', handleWheel);
    return () => window.removeEventListener('wheel', handleWheel);
  }, [activeTexture, setTexture]);

  return (
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-2 bg-black/50 p-2 rounded-lg border border-white/20">
      {Object.entries(images).map(([k, src]) => (
        <div
          key={k}
          className={`w-12 h-12 flex items-center justify-center text-[10px] font-bold uppercase rounded cursor-pointer transition-all ${
            activeTexture === k ? 'bg-white text-black scale-110' : 'bg-gray-800 text-white opacity-60'
          }`}
          onClick={() => setTexture(k)}
        >
          {src}
        </div>
      ))}
    </div>
  );
};

export const Crosshair = () => {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
      <div className="w-4 h-4 border-2 border-white/50 rounded-full flex items-center justify-center">
        <div className="w-1 h-1 bg-white rounded-full"></div>
      </div>
    </div>
  );
};

export const Instructions = () => {
  return (
    <div className="absolute top-4 left-4 text-white p-4 bg-black/40 backdrop-blur-sm rounded-lg border border-white/10 text-sm">
      <p className="font-bold mb-2">操作方法:</p>
      <ul className="space-y-1 opacity-80">
        <li>WASD : 移動</li>
        <li>Space : ジャンプ</li>
        <li>右クリック : ブロックを置く</li>
        <li>左クリック : ブロックを壊す</li>
        <li>ホイール : アイテム切り替え</li>
        <li>F5 : 視点切り替え</li>
        <li>1-9, 0 : ブロック選択</li>
        <li>ESC : カーソルを表示</li>
      </ul>
      <p className="mt-4 text-[10px] uppercase tracking-wider opacity-60">マインクラフト風ゲーム by Build</p>
    </div>
  );
};

export const StartScreen = ({ onStart }: { onStart: () => void }) => {
  return (
    <div 
      className="absolute inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md cursor-pointer"
      onClick={onStart}
    >
      <div className="text-center">
        <h1 className="text-5xl font-black text-white mb-8 tracking-tighter uppercase italic">
          Block World
        </h1>
        <div className="flex flex-col items-center gap-4">
          <div className="px-8 py-3 bg-white text-black font-bold text-lg rounded-full hover:scale-110 transition-transform active:scale-95 shadow-xl">
            CLICK TO START
          </div>
          <p className="text-white/40 text-xs uppercase tracking-widest mt-4">
            Press ESC to pause / release cursor
          </p>
        </div>
      </div>
    </div>
  );
};
