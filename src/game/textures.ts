import * as THREE from 'three';

/**
 * Procedural Canvas Texture Generator for Candy Apocalypse
 * High fidelity textures matching character and environment references
 */

// Character Face Texture matching the uploaded photo 1790415117642.jpg
// (Defined jawline, intense dark eyes with smokey eyeliner, arched brows, warm tan skin)
export function createCharacterFaceTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Warm natural tanned skin tone
  ctx.fillStyle = '#cf9375';
  ctx.fillRect(0, 0, 512, 512);

  // Soft cheekbone contour
  const cheekGradLeft = ctx.createRadialGradient(160, 310, 20, 160, 310, 90);
  cheekGradLeft.addColorStop(0, 'rgba(175, 105, 80, 0.35)');
  cheekGradLeft.addColorStop(1, 'rgba(207, 147, 117, 0)');
  ctx.fillStyle = cheekGradLeft;
  ctx.fillRect(70, 220, 180, 180);

  const cheekGradRight = ctx.createRadialGradient(352, 310, 20, 352, 310, 90);
  cheekGradRight.addColorStop(0, 'rgba(175, 105, 80, 0.35)');
  cheekGradRight.addColorStop(1, 'rgba(207, 147, 117, 0)');
  ctx.fillStyle = cheekGradRight;
  ctx.fillRect(262, 220, 180, 180);

  // Arched dark eyebrows
  ctx.strokeStyle = '#181214';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';

  // Left eyebrow
  ctx.beginPath();
  ctx.moveTo(130, 205);
  ctx.quadraticCurveTo(185, 185, 230, 198);
  ctx.stroke();

  // Right eyebrow
  ctx.beginPath();
  ctx.moveTo(282, 198);
  ctx.quadraticCurveTo(327, 185, 382, 205);
  ctx.stroke();

  // Eyes - Smokey eyeshadow & dark almond eyes
  const drawEye = (cx: number, cy: number, flip: boolean) => {
    // Smokey shadow
    const shadowGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 32);
    shadowGrad.addColorStop(0, 'rgba(20, 14, 16, 0.8)');
    shadowGrad.addColorStop(1, 'rgba(20, 14, 16, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 32, 0, Math.PI * 2);
    ctx.fill();

    // Sclera
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 28, 15, flip ? -0.08 : 0.08, 0, Math.PI * 2);
    ctx.fill();

    // Iris (Deep dark brown / hazel amber)
    const irisGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 14);
    irisGrad.addColorStop(0, '#522915');
    irisGrad.addColorStop(0.7, '#241209');
    irisGrad.addColorStop(1, '#110703');
    ctx.fillStyle = irisGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 13, 0, Math.PI * 2);
    ctx.fill();

    // Pupil
    ctx.fillStyle = '#0a0505';
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fill();

    // Catchlight (glint)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - 3, cy - 3, 3, 0, Math.PI * 2);
    ctx.fill();

    // Eyeliner & Lashes
    ctx.strokeStyle = '#0f080a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 3, 29, 13, flip ? -0.08 : 0.08, Math.PI * 0.9, Math.PI * 2.1);
    ctx.stroke();
  };

  drawEye(180, 235, false);
  drawEye(332, 235, true);

  // Nose contour & nostrils
  ctx.strokeStyle = 'rgba(150, 85, 60, 0.45)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(250, 240);
  ctx.lineTo(248, 295);
  ctx.quadraticCurveTo(246, 315, 238, 322);
  ctx.stroke();

  // Nostrils
  ctx.fillStyle = 'rgba(110, 55, 35, 0.6)';
  ctx.beginPath();
  ctx.arc(242, 325, 4, 0, Math.PI * 2);
  ctx.arc(270, 325, 4, 0, Math.PI * 2);
  ctx.fill();

  // Defined feminine lips (warm berry nude)
  const lipGrad = ctx.createLinearGradient(210, 370, 210, 410);
  lipGrad.addColorStop(0, '#b85d58');
  lipGrad.addColorStop(0.5, '#cc6b65');
  lipGrad.addColorStop(1, '#9e4642');
  ctx.fillStyle = lipGrad;

  // Upper lip with cupid's bow
  ctx.beginPath();
  ctx.moveTo(205, 385);
  ctx.quadraticCurveTo(235, 372, 256, 379);
  ctx.quadraticCurveTo(277, 372, 307, 385);
  ctx.quadraticCurveTo(256, 395, 205, 385);
  ctx.fill();

  // Lower lip
  ctx.beginPath();
  ctx.moveTo(205, 385);
  ctx.quadraticCurveTo(256, 420, 307, 385);
  ctx.quadraticCurveTo(256, 396, 205, 385);
  ctx.fill();

  // Lip gloss highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.beginPath();
  ctx.ellipse(256, 400, 16, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// Tattoo Sleeve Texture for Right Arm (Matching uploaded photo)
// (Roses, ornate vine filigree, intricate black/grey work)
export function createTattooTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Warm tanned athletic skin base
  ctx.fillStyle = '#cf9375';
  ctx.fillRect(0, 0, 512, 512);

  // Black and grey tattoo ink
  ctx.strokeStyle = '#231518';
  ctx.fillStyle = '#231518';
  ctx.lineWidth = 3;

  // Draw intricate floral roses & vines
  for (let y = 50; y < 480; y += 75) {
    const cx = 256 + Math.sin(y * 0.05) * 45;

    // Rose petals
    ctx.beginPath();
    ctx.arc(cx, y, 24, 0, Math.PI * 2);
    ctx.stroke();

    for (let r = 8; r < 24; r += 6) {
      ctx.beginPath();
      ctx.arc(cx, y, r, (y * 0.1) % Math.PI, (y * 0.1) % Math.PI + Math.PI * 1.4);
      ctx.stroke();
    }

    // Leaves and thorny vines
    ctx.beginPath();
    ctx.moveTo(cx - 30, y);
    ctx.quadraticCurveTo(cx - 50, y - 20, cx - 20, y - 35);
    ctx.quadraticCurveTo(cx, y - 20, cx - 30, y);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx + 30, y);
    ctx.quadraticCurveTo(cx + 50, y + 20, cx + 20, y + 35);
    ctx.quadraticCurveTo(cx, y + 20, cx + 30, y);
    ctx.fill();

    // Script lettering & filigree flourishes
    ctx.beginPath();
    ctx.moveTo(100, y + 25);
    ctx.bezierCurveTo(200, y + 10, 300, y + 45, 412, y + 20);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// Teal / Aquamarine Bikini Texture
export function createTealBikiniTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Teal base
  ctx.fillStyle = '#14b8a6';
  ctx.fillRect(0, 0, 256, 256);

  // Fabric ribbing / micro texture
  ctx.fillStyle = '#0d9488';
  for (let x = 0; x < 256; x += 4) {
    ctx.fillRect(x, 0, 2, 256);
  }

  // Shading edges
  ctx.strokeStyle = '#042f2e';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 252, 252);

  return new THREE.CanvasTexture(canvas);
}

// Peppermint swirl texture
export function createPeppermintTexture(colorA = '#ff2b6d', colorB = '#ffffff', spokes = 12): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const cx = 256;
  const cy = 256;
  const radius = 256;

  ctx.fillStyle = colorB;
  ctx.fillRect(0, 0, 512, 512);

  const step = (Math.PI * 2) / spokes;
  ctx.fillStyle = colorA;

  for (let i = 0; i < spokes; i += 2) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    const startAngle = i * step;
    const endAngle = (i + 1) * step;

    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fill();
  }

  const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, radius);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
  grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// Pastel Candy Land Floor Texture matching reference image
// (Vibrant pastel pink frosted sugar arena, rainbow candy stripes, vanilla icing paths, sprinkles)
export function createRainbowFloorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // 1. Base: Soft pastel frosted strawberry sugar ground
  const baseGrad = ctx.createLinearGradient(0, 0, 1024, 1024);
  baseGrad.addColorStop(0, '#fbcfe8'); // Pastel soft pink
  baseGrad.addColorStop(0.5, '#f472b6'); // Rose pastel
  baseGrad.addColorStop(1, '#f9a8d4'); // Candy pink
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, 1024, 1024);

  // Subtle wafer/sugar checkered grid
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  for (let x = 0; x < 1024; x += 64) {
    for (let y = 0; y < 1024; y += 64) {
      if ((x / 64 + y / 64) % 2 === 0) {
        ctx.fillRect(x, y, 64, 64);
      }
    }
  }

  // 2. Winding Rainbow Syrup Road down the arena
  const rainbowBands = [
    { color: '#fb7185', width: 44 }, // Strawberry
    { color: '#fbbf24', width: 36 }, // Butterscotch
    { color: '#34d399', width: 28 }, // Mint
    { color: '#38bdf8', width: 20 }, // Cotton candy cyan
    { color: '#c084fc', width: 12 }, // Grape lavender
  ];

  rainbowBands.forEach((band) => {
    ctx.lineWidth = band.width;
    ctx.strokeStyle = band.color;
    ctx.beginPath();
    ctx.moveTo(512, 0);
    ctx.bezierCurveTo(400, 300, 620, 720, 512, 1024);
    ctx.stroke();
  });

  // Vanilla marshmallow frosting highlights along the road
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#ffffff';
  ctx.setLineDash([20, 15]);
  ctx.beginPath();
  ctx.moveTo(512, 0);
  ctx.bezierCurveTo(400, 300, 620, 720, 512, 1024);
  ctx.stroke();
  ctx.setLineDash([]);

  // 3. Decorative Swirl Candy Circles / Peppermint Medallions on the ground
  const medallions = [
    { x: 260, y: 280, r: 75, col1: '#ff2b75', col2: '#ffffff' },
    { x: 760, y: 320, r: 85, col1: '#38bdf8', col2: '#ffffff' },
    { x: 240, y: 780, r: 90, col1: '#a855f7', col2: '#fbcfe8' },
    { x: 780, y: 750, r: 80, col1: '#fbbf24', col2: '#ffffff' },
    { x: 512, y: 512, r: 110, col1: '#ec4899', col2: '#ffffff' },
  ];

  medallions.forEach((m) => {
    const spokes = 10;
    const step = (Math.PI * 2) / spokes;
    ctx.fillStyle = m.col2;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = m.col1;
    for (let i = 0; i < spokes; i += 2) {
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.arc(m.x, m.y, m.r, i * step, (i + 1) * step);
      ctx.closePath();
      ctx.fill();
    }

    // Outer candy ring
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
    ctx.stroke();
  });

  // 4. Sprinkles! (Hundreds of colorful sugar confetti sprinkles)
  const sprinkleColors = ['#ffffff', '#f43f5e', '#38bdf8', '#fbbf24', '#34d399', '#c084fc'];
  for (let i = 0; i < 480; i++) {
    const sx = Math.random() * 1024;
    const sy = Math.random() * 1024;
    const w = 4 + Math.random() * 8;
    const h = 2.5 + Math.random() * 3.5;
    const rot = Math.random() * Math.PI;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(rot);
    ctx.fillStyle = sprinkleColors[Math.floor(Math.random() * sprinkleColors.length)];
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  }

  // 5. Soft dreamlike vignette
  const vig = ctx.createRadialGradient(512, 512, 340, 512, 512, 720);
  vig.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
  vig.addColorStop(1, 'rgba(88, 28, 135, 0.45)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, 1024, 1024);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

// Spooky Oozing Candy Tree Bark
export function createCandyBarkTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1c0f20';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = '#2d1838';
  ctx.lineWidth = 4;
  for (let i = 0; i < 15; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 18, 0);
    ctx.bezierCurveTo(i * 18 + 10, 80, i * 18 - 10, 160, i * 18 + 5, 256);
    ctx.stroke();
  }

  ctx.fillStyle = '#4ade80';
  for (let i = 0; i < 8; i++) {
    const dx = Math.random() * 256;
    const dy = Math.random() * 256;
    ctx.beginPath();
    ctx.arc(dx, dy, 3 + Math.random() * 4, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// Cookie boulder texture with chocolate chips
export function createCookieTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#d49b6a';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? '#b87c4d' : '#e6b588';
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
  }

  ctx.fillStyle = '#361b0d';
  for (let i = 0; i < 16; i++) {
    const cx = Math.random() * 240 + 8;
    const cy = Math.random() * 240 + 8;
    ctx.beginPath();
    ctx.arc(cx, cy, 6 + Math.random() * 7, 0, Math.PI * 2);
    ctx.fill();
  }

  return new THREE.CanvasTexture(canvas);
}
