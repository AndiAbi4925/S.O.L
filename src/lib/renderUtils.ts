import { format } from 'date-fns';

export interface LayoutDef {
  id: string;
  name: string;
  width: number;
  height: number;
  slots: { x: number; y: number; w: number; h: number }[];
  datePos: { x: number; y: number };
}

export interface CardTheme {
  id: string;
  name: string;
  bgClass: string; // Tailwind bg color representation
  bgHex: string;   // Native canvas background color
  borderHex: string;
  fontHex: string;
  stampColor: string;
  label: string;
}

export const CARD_THEMES: Record<string, CardTheme> = {
  'alabaster': {
    id: 'alabaster',
    name: 'Warm Alabaster',
    bgClass: 'bg-[#faf9f6]',
    bgHex: '#faf9f6',
    borderHex: '#eaeaea',
    fontHex: '#1a1a1a',
    stampColor: '#ff4500', // Neon Orange date stamp
    label: 'S.O.L ARCHIVE',
  },
  'obsidian': {
    id: 'obsidian',
    name: 'Ink Obsidian',
    bgClass: 'bg-[#121212]',
    bgHex: '#121212',
    borderHex: '#2a2a2a',
    fontHex: '#e0e0e0',
    stampColor: '#ffcc00', // Yellow date stamp
    label: 'SNAP OF LOVE • DIGITAL',
  },
  'blossom': {
    id: 'blossom',
    name: 'Cherry Blossom',
    bgClass: 'bg-[#fff0f3]',
    bgHex: '#fff0f3',
    borderHex: '#ffccd5',
    fontHex: '#590d22',
    stampColor: '#ff4d6d', // Sweet Pink date stamp
    label: 'S.O.L • CHERRY MOMENTS',
  },
  'parchment': {
    id: 'parchment',
    name: 'Vintage Parchment',
    bgClass: 'bg-[#f4ecd8]',
    bgHex: '#f4ecd8',
    borderHex: '#dfd5be',
    fontHex: '#3d3423',
    stampColor: '#c84b31', // Rust Red date stamp
    label: 'S.O.L MEMORIES EST. 2026',
  },
  'cyber': {
    id: 'cyber',
    name: 'Cyber Silver',
    bgClass: 'bg-[#e2e8f0]',
    bgHex: '#e2e8f0',
    borderHex: '#94a3b8',
    fontHex: '#0f172a',
    stampColor: '#06b6d4', // Electric Cyan date stamp
    label: 'S.O.L • CYBERSPACE v2.0',
  },
};

export const LAYOUTS: Record<string, LayoutDef> = {
  '1x4': {
    id: '1x4',
    name: 'Classic 4-Strip',
    width: 600,
    height: 1800,
    slots: [
      { x: 40, y: 40, w: 520, h: 390 },
      { x: 40, y: 450, w: 520, h: 390 },
      { x: 40, y: 860, w: 520, h: 390 },
      { x: 40, y: 1270, w: 520, h: 390 },
    ],
    datePos: { x: 40, y: 1730 },
  },
  '2x2': {
    id: '2x2',
    name: 'Quad (Square)',
    width: 1200,
    height: 1040,
    slots: [
      { x: 60, y: 60, w: 520, h: 390 },
      { x: 620, y: 60, w: 520, h: 390 },
      { x: 60, y: 490, w: 520, h: 390 },
      { x: 620, y: 490, w: 520, h: 390 },
    ],
    datePos: { x: 60, y: 980 },
  },
  '1x3': {
    id: '1x3',
    name: 'Minimal 3-Strip',
    width: 600,
    height: 1400,
    slots: [
      { x: 40, y: 40, w: 520, h: 390 },
      { x: 40, y: 450, w: 520, h: 390 },
      { x: 40, y: 860, w: 520, h: 390 },
    ],
    datePos: { x: 40, y: 1330 },
  },
  '1x1': {
    id: '1x1',
    name: 'Vintage Polaroid',
    width: 600,
    height: 720,
    slots: [
      { x: 50, y: 50, w: 500, h: 500 },
    ],
    datePos: { x: 50, y: 640 },
  },
  '2x1': {
    id: '2x1',
    name: 'Cinematic Duo',
    width: 1200,
    height: 600,
    slots: [
      { x: 60, y: 60, w: 510, h: 380 },
      { x: 630, y: 60, w: 510, h: 380 },
    ],
    datePos: { x: 60, y: 540 },
  },
};

export const VISUAL_FILTERS = {
  none: { id: 'none', name: 'Classic Color', style: 'none', canvasFilter: 'none' },
  grayscale: { id: 'grayscale', name: 'Noir Monochromatic', style: 'grayscale(100%) contrast(115%) brightness(105%)', canvasFilter: 'grayscale(1) contrast(1.15) brightness(1.05)' },
  vintage: { id: 'vintage', name: 'Warm Nostalgia', style: 'sepia(35%) saturate(120%) hue-rotate(-5deg) contrast(105%)', canvasFilter: 'sepia(0.35) saturate(1.2) hue-rotate(-5deg) contrast(1.05)' },
  cyber: { id: 'cyber', name: 'Chrome Velvet', style: 'saturate(145%) hue-rotate(15deg) contrast(115%) brightness(102%)', canvasFilter: 'saturate(1.45) hue-rotate(15deg) contrast(1.15) brightness(1.02)' },
};

export type FilterType = keyof typeof VISUAL_FILTERS;

export function drawGrain(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number
) {
  if (intensity <= 0) return;

  const noiseCanvas = document.createElement('canvas');
  noiseCanvas.width = 256;
  noiseCanvas.height = 256;
  const nCtx = noiseCanvas.getContext('2d');
  if (!nCtx) return;

  const imgData = nCtx.createImageData(256, 256);
  const data = imgData.data;

  // Max alpha correlates to intensity (scale 0-100)
  const maxAlpha = Math.min((intensity / 100) * 80, 255);

  for (let i = 0; i < data.length; i += 4) {
    const v = Math.random() * 255;
    data[i] = v; // R
    data[i + 1] = v; // G
    data[i + 2] = v; // B
    data[i + 3] = Math.random() * maxAlpha; // A
  }
  nCtx.putImageData(imgData, 0, 0);

  ctx.globalCompositeOperation = 'source-over';
  const pattern = ctx.createPattern(noiseCanvas, 'repeat');
  if (pattern) {
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, height);
  }
}

export function renderStrip(
  photos: HTMLCanvasElement[][],
  layout: LayoutDef,
  grain: number,
  showDate: boolean,
  frameIndex: number,
  themeId: string = 'alabaster',
  filterId: FilterType = 'none'
): HTMLCanvasElement {
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = layout.width;
  bgCanvas.height = layout.height;
  const ctx = bgCanvas.getContext('2d');
  if (!ctx) return bgCanvas;

  const theme = CARD_THEMES[themeId] || CARD_THEMES.alabaster;

  // Draw customized premium theme paper background
  ctx.fillStyle = theme.bgHex;
  ctx.fillRect(0, 0, layout.width, layout.height);

  // Draw photos into computed slots
  layout.slots.forEach((slot, idx) => {
    if (photos[idx] && photos[idx][frameIndex]) {
      const img = photos[idx][frameIndex];
      const imgRatio = img.width / img.height;
      const slotRatio = slot.w / slot.h;

      let sx = 0,
        sy = 0,
        sw = img.width,
        sh = img.height;

      // Cover crop strategy
      if (imgRatio > slotRatio) {
        sw = sh * slotRatio;
        sx = (img.width - sw) / 2;
      } else {
        sh = sw / slotRatio;
        sy = (img.height - sh) / 2;
      }

      // Draw backdrop border/accent first
      ctx.fillStyle = theme.borderHex;
      ctx.fillRect(slot.x, slot.y, slot.w, slot.h);

      // Save context state to apply standard photo-level filter and clip correctly
      ctx.save();
      
      // Hardware accelerated filter application
      const activeFilter = VISUAL_FILTERS[filterId] || VISUAL_FILTERS.none;
      if (activeFilter.canvasFilter !== 'none') {
        ctx.filter = activeFilter.canvasFilter;
      }

      ctx.drawImage(img, sx, sy, sw, sh, slot.x, slot.y, slot.w, slot.h);
      ctx.restore();
    } else {
      // Empty slot placeholder
      ctx.fillStyle = theme.borderHex;
      ctx.fillRect(slot.x, slot.y, slot.w, slot.h);
    }
  });

  // Apply Grain filter overlay
  drawGrain(ctx, layout.width, layout.height, grain);

  // Apply Date Stamp
  if (showDate) {
    const dateStr = format(new Date(), 'yy.MM.dd'); // nostalgic camera format e.g. '26.05.20'
    ctx.font = '36px "VT323", monospace';
    ctx.fillStyle = theme.stampColor;
    
    // Position date stamps aesthetically based on layout width & layout definition
    ctx.fillText(`'${dateStr}`, layout.datePos.x, layout.datePos.y);
  }

  // Draw Brand signature on physical paper bottom margin
  const textX = layout.width - 240;
  const textY = layout.datePos.y;
  ctx.font = 'bold 16px "Inter", sans-serif';
  ctx.fillStyle = theme.fontHex;
  ctx.fillText(theme.label, textX, textY);

  return bgCanvas;
}
