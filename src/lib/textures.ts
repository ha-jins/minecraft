import * as THREE from 'three';

const createPixelTexture = (
  color: string,
  noiseColor: string,
  pixelSize = 16,
  pattern?: (ctx: CanvasRenderingContext2D, size: number) => void
) => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 64, 64);

  // Random noise
  const s = 64 / pixelSize;
  for (let x = 0; x < pixelSize; x++) {
    for (let y = 0; y < pixelSize; y++) {
      ctx.fillStyle = Math.random() > 0.5 ? noiseColor : color;
      ctx.globalAlpha = 0.3 + Math.random() * 0.4;
      ctx.fillRect(x * s, y * s, s, s);
    }
  }
  ctx.globalAlpha = 1.0;

  if (pattern) {
    pattern(ctx, 64);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  return texture;
};

// Procedural Patterns
const drawPlanks = (ctx: CanvasRenderingContext2D, size: number) => {
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, size, size / 2);
  ctx.strokeRect(0, size / 2, size, size / 2);
};

const drawLogSide = (ctx: CanvasRenderingContext2D, size: number) => {
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 2;
  for (let i = 0; i < size; i += 8) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
  }
};

const drawLogTop = (ctx: CanvasRenderingContext2D, size: number) => {
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 6, 0, Math.PI * 2);
  ctx.stroke();
};

const drawStone = (ctx: CanvasRenderingContext2D, size: number) => {
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  for (let i = 0; i < 10; i++) {
    ctx.strokeRect(Math.random() * size, Math.random() * size, 8, 8);
  }
};

const drawCobblestone = (ctx: CanvasRenderingContext2D, size: number) => {
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1;
  const step = size / 4;
  for (let x = 0; x < size; x += step) {
    for (let y = 0; y < size; y += step) {
      ctx.strokeRect(x, y, step, step);
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.fillRect(x + 2, y + 2, step - 4, step - 4);
    }
  }
};

const drawLeaves = (ctx: CanvasRenderingContext2D, size: number) => {
  ctx.fillStyle = 'rgba(20, 80, 20, 0.6)';
  for (let i = 0; i < 40; i++) {
    ctx.fillRect(Math.random() * size, Math.random() * size, 8, 8);
  }
};

export const textures = {
  grassTop: createPixelTexture('#7fc431', '#5ea325', 16),
  grassSide: createPixelTexture('#8f6b4d', '#7fc431', 16, (ctx) => {
    ctx.fillStyle = '#7fc431';
    ctx.fillRect(0, 0, 64, 28); // Increased from 16 to 28 (approx +20% of block side)
  }),
  dirt: createPixelTexture('#b38a64', '#8f6b4d', 16),
  stone: createPixelTexture('#a0a0a0', '#808080', 16, drawStone),
  cobblestone: createPixelTexture('#909090', '#707070', 16, drawCobblestone),
  sand: createPixelTexture('#f2ebc0', '#e0d8a0', 16),
  leaves: createPixelTexture('#4b7a37', '#395c2a', 16, drawLeaves),
  woodPlanks: createPixelTexture('#c49463', '#a37b52', 16, drawPlanks),
  trunkSide: createPixelTexture('#85562c', '#6e4724', 16, drawLogSide),
  trunkTop: createPixelTexture('#ffdfaf', '#fcd397', 16, drawLogTop),
  glass: createPixelTexture('rgba(220, 250, 255, 0.5)', '#ffffff', 16, (ctx) => {
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(10, 10);
    ctx.lineTo(30, 30);
    ctx.stroke();
  }),
  // Player textures (Character from image)
  playerSkin: createPixelTexture('#ffdbac', '#f1c27d', 8),
  playerHair: createPixelTexture('#2b59c3', '#1e3d8a', 8), // Blue main
  playerHairHighlight: createPixelTexture('#c32b59', '#8a1e3d', 8), // Red streaks
  playerShirt: createPixelTexture('#e986b8', '#c06b94', 8), // Pinkish top
  playerPants: createPixelTexture('#1a237e', '#0d154d', 8), // Dark navy skirt/pants
  playerAntenna: createPixelTexture('#ffeb3b', '#fbc02d', 4), // Yellow ahoge
  torch: createPixelTexture('#8b4513', '#6e4724', 16, (ctx, size) => {
    // Fire top
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(0, 0, size, size / 2);
    ctx.fillStyle = '#ff6600';
    ctx.fillRect(size / 4, 0, size / 2, size / 3);
  }),
};
