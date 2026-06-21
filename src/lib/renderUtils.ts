import { format } from 'date-fns';
import qrcode from 'qrcode-generator';

export interface PlacedSticker {
  id: string;
  type: 'emoji' | 'text';
  text: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  scale: number;
  rotation: number;
}

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
    stampColor: '#8e1616', // Deep Ruby date stamp
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
    stampColor: '#8e1616', // Deep Ruby date stamp
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

function applyManualFilter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  filterId: FilterType
) {
  if (filterId === 'none') return;
  const imgData = ctx.getImageData(x, y, w, h);
  const data = imgData.data;

  if (filterId === 'grayscale') {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      let gray = 0.299 * r + 0.587 * g + 0.114 * b;
      gray = gray * 1.05; // Brightness (1.05)
      const factor = (259 * (38.25 + 255)) / (255 * (259 - 38.25));
      gray = factor * (gray - 128) + 128; // Contrast (1.15)
      const finalVal = Math.min(255, Math.max(0, gray));
      data[i] = finalVal;
      data[i + 1] = finalVal;
      data[i + 2] = finalVal;
    }
  } else if (filterId === 'vintage') {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      const sr = (r * 0.393 + g * 0.769 + b * 0.189);
      const sg = (r * 0.349 + g * 0.686 + b * 0.168);
      const sb = (r * 0.272 + g * 0.534 + b * 0.131);
      
      let fr = r * 0.65 + sr * 0.35;
      let fg = g * 0.65 + sg * 0.35;
      let fb = b * 0.65 + sb * 0.35;
      
      const gray = 0.299 * fr + 0.587 * fg + 0.114 * fb;
      fr = gray + (fr - gray) * 1.2; // Saturation (1.2)
      fg = gray + (fg - gray) * 1.2;
      fb = gray + (fb - gray) * 1.2;

      const factor = (259 * (12.75 + 255)) / (255 * (259 - 12.75));
      fr = factor * (fr - 128) + 128; // Contrast (1.05)
      fg = factor * (fg - 128) + 128;
      fb = factor * (fb - 128) + 128;
      
      data[i] = Math.min(255, Math.max(0, fr));
      data[i + 1] = Math.min(255, Math.max(0, fg));
      data[i + 2] = Math.min(255, Math.max(0, fb));
    }
  } else if (filterId === 'cyber') {
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i] * 1.02; // Brightness (1.02)
      let g = data[i + 1] * 1.02;
      let b = data[i + 2] * 1.02;
      
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray + (r - gray) * 1.45; // Saturation (1.45)
      g = gray + (g - gray) * 1.45;
      b = gray + (b - gray) * 1.45;
      
      const factor = (259 * (38.25 + 255)) / (255 * (259 - 38.25));
      r = factor * (r - 128) + 128; // Contrast (1.15)
      g = factor * (g - 128) + 128;
      b = factor * (b - 128) + 128;
      
      data[i] = Math.min(255, Math.max(0, r));
      data[i + 1] = Math.min(255, Math.max(0, g));
      data[i + 2] = Math.min(255, Math.max(0, b));
    }
  }
  ctx.putImageData(imgData, x, y);
}

export function renderStrip(
  photos: HTMLCanvasElement[][],
  layout: LayoutDef,
  grain: number,
  showDate: boolean,
  frameIndex: number,
  themeId: string = 'alabaster',
  filterId: FilterType = 'none',
  stickers: PlacedSticker[] = []
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
        if ('filter' in ctx) {
          ctx.filter = activeFilter.canvasFilter;
        }
      }

      ctx.drawImage(img, sx, sy, sw, sh, slot.x, slot.y, slot.w, slot.h);
      ctx.restore();

      // Fallback for Safari/iOS browsers that do not support native Canvas filters
      if (!('filter' in ctx) && filterId !== 'none') {
        applyManualFilter(ctx, slot.x, slot.y, slot.w, slot.h, filterId);
      }
    } else {
      // Empty slot placeholder
      ctx.fillStyle = theme.borderHex;
      ctx.fillRect(slot.x, slot.y, slot.w, slot.h);
    }
  });

  // Apply Grain filter overlay — scoped to photo slots only (not the card frame)
  if (grain > 0) {
    layout.slots.forEach((slot, idx) => {
      if (photos[idx] && photos[idx][frameIndex]) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(slot.x, slot.y, slot.w, slot.h);
        ctx.clip();
        drawGrain(ctx, layout.width, layout.height, grain);
        ctx.restore();
      }
    });
  }

  // Apply Date Stamp
  if (showDate) {
    const dateStr = format(new Date(), 'yy.MM.dd'); // nostalgic camera format e.g. '26.05.20'
    ctx.font = '36px "VT323", monospace';
    ctx.fillStyle = theme.stampColor;
    
    // Position date stamps aesthetically based on layout width & layout definition
    ctx.fillText(`'${dateStr}`, layout.datePos.x, layout.datePos.y);
  }

  // Draw QR code linking to Instagram page and Brand Signature
  try {
    const qr = qrcode(0, 'M');
    qr.addData('https://www.instagram.com/snapoflove.id/');
    qr.make();

    const moduleCount = qr.getModuleCount();
    const qrSize = 56; // px size of the QR code block
    const cellSize = qrSize / moduleCount;

    // Position: bottom-right corner of the strip
    const qrX = layout.width - qrSize - 40;
    const qrY = layout.datePos.y - qrSize + 6;

    // Draw QR modules (No background, match stamp color)
    ctx.fillStyle = theme.stampColor;
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (qr.isDark(row, col)) {
          ctx.fillRect(
            qrX + col * cellSize,
            qrY + row * cellSize,
            Math.ceil(cellSize),
            Math.ceil(cellSize)
          );
        }
      }
    }

    // Draw Brand signature on physical paper bottom margin, to the left of the QR
    const textX = qrX - 15;
    const textY = layout.datePos.y;
    ctx.font = 'bold 16px "Inter", sans-serif';
    ctx.fillStyle = theme.fontHex;
    ctx.textAlign = 'right';
    ctx.fillText(theme.label, textX, textY);
    ctx.textAlign = 'left'; // reset

  } catch (e) {
    console.warn('QR code generation failed:', e);
    // Fallback if QR fails
    const textX = layout.width - 40;
    const textY = layout.datePos.y;
    ctx.font = 'bold 16px "Inter", sans-serif';
    ctx.fillStyle = theme.fontHex;
    ctx.textAlign = 'right';
    ctx.fillText(theme.label, textX, textY);
    ctx.textAlign = 'left'; // reset
  }

  // Draw placed stickers on top of everything
  if (stickers && stickers.length > 0) {
    stickers.forEach((sticker) => {
      ctx.save();
      
      const x = (sticker.x / 100) * layout.width;
      const y = (sticker.y / 100) * layout.height;
      
      ctx.translate(x, y);
      ctx.rotate((sticker.rotation * Math.PI) / 180);
      
      const baseFontSize = 48;
      const fontSize = baseFontSize * sticker.scale;
      
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      if (sticker.type === 'text') {
        ctx.font = `bold ${fontSize}px "Courier New", Courier, monospace`;
        const textWidth = ctx.measureText(sticker.text).width;
        const paddingX = fontSize * 0.4;
        const paddingY = fontSize * 0.25;
        
        // Draw label tape background
        ctx.fillStyle = theme.fontHex;
        ctx.fillRect(
          -textWidth / 2 - paddingX,
          -fontSize / 2 - paddingY,
          textWidth + paddingX * 2,
          fontSize + paddingY * 2
        );
        
        // Draw label text
        ctx.fillStyle = theme.bgHex;
        ctx.fillText(sticker.text, 0, 0);
      } else {
        // Draw Emoji
        ctx.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
        ctx.fillText(sticker.text, 0, 0);
      }
      
      ctx.restore();
    });
  }

  return bgCanvas;
}
