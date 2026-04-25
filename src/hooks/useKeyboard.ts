import { useEffect, useState } from 'react';

function moveFieldByKey(key: string) {
  const keys: Record<string, string> = {
    KeyW: 'forward',
    KeyS: 'backward',
    KeyA: 'left',
    KeyD: 'right',
    Space: 'jump',
    F5: 'toggleView',
    Digit1: 'grass',
    Digit2: 'glass',
    Digit3: 'wood',
    Digit4: 'log',
    Digit5: 'stone',
    Digit6: 'dirt',
    Digit7: 'cobblestone',
    Digit8: 'sand',
    Digit9: 'leaves',
    Digit0: 'torch',
  };
  return keys[key];
}

export const useKeyboard = () => {
  const [actions, setActions] = useState({
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    toggleView: false,
    dirt: false,
    grass: false,
    glass: false,
    wood: false,
    log: false,
    stone: false,
    cobblestone: false,
    sand: false,
    leaves: false,
    torch: false,
    leftClick: false,
    rightClick: false,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      
      const action = moveFieldByKey(e.code);
      if (action) {
        if (e.code === 'F5') {
          e.preventDefault();
        }
        setActions((prev) => ({ ...prev, [action]: true }));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const action = moveFieldByKey(e.code);
      if (action) {
        setActions((prev) => ({ ...prev, [action]: false }));
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) setActions((prev) => ({ ...prev, leftClick: true }));
      if (e.button === 2) setActions((prev) => ({ ...prev, rightClick: true }));
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) setActions((prev) => ({ ...prev, leftClick: false }));
      if (e.button === 2) setActions((prev) => ({ ...prev, rightClick: false }));
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return actions;
};
