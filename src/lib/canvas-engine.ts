import jsPDF from 'jspdf';
import confetti from 'canvas-confetti';
import { FlyerTemplate } from '../types/database';

export interface PhotoCropSettings {
  zoom?: number; // 1.0 to 3.5 (100% to 350%)
  offsetX?: number; // -1 to 1 (horizontal pan)
  offsetY?: number; // -1 to 1 (vertical pan)
  frameScale?: number; // 0.8 to 2.5 (scales the photo container / circle to fill white spaces)
}

export interface CompositePayload {
  flyerImageUrl: string;
  participantImageUrl: string;
  participantName: string;
  template: FlyerTemplate;
  cropSettings?: PhotoCropSettings;
}

/**
 * Loads an image with crossOrigin = 'anonymous' and returns a Promise
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error('Image source URL is empty.'));
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Retry without anonymous if local blob/data URL
      if (src.startsWith('data:') || src.startsWith('blob:')) {
        const retryImg = new Image();
        retryImg.onload = () => resolve(retryImg);
        retryImg.onerror = () => reject(new Error('Failed to decode image data.'));
        retryImg.src = src;
        return;
      }
      reject(new Error(`Failed to load image from source: ${src.substring(0, 80)}...`));
    };
    img.src = src;
  });
}

/**
 * Draws an image into target bounding box with cover scaling, interactive zoom, and pan offset
 */
function drawImageCoverWithCrop(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  targetX: number,
  targetY: number,
  targetW: number,
  targetH: number,
  zoom = 1,
  offsetX = 0,
  offsetY = 0
) {
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const targetRatio = targetW / targetH;
  let baseW = img.naturalWidth;
  let baseH = img.naturalHeight;

  if (imgRatio > targetRatio) {
    baseW = img.naturalHeight * targetRatio;
  } else {
    baseH = img.naturalWidth / targetRatio;
  }

  // Zoom: higher zoom crops in closer to reveal the face prominently
  const effectiveZoom = Math.max(1, zoom);
  const sWidth = baseW / effectiveZoom;
  const sHeight = baseH / effectiveZoom;

  // Maximum pan boundaries on source image
  const maxSlackX = Math.max(0, (img.naturalWidth - sWidth) / 2);
  const maxSlackY = Math.max(0, (img.naturalHeight - sHeight) / 2);

  const centerX = (img.naturalWidth - sWidth) / 2;
  const centerY = (img.naturalHeight - sHeight) / 2;

  // offsetX / offsetY range: -1 to 1
  const sx = Math.max(0, Math.min(img.naturalWidth - sWidth, centerX + offsetX * maxSlackX));
  const sy = Math.max(0, Math.min(img.naturalHeight - sHeight, centerY + offsetY * maxSlackY));

  ctx.drawImage(img, sx, sy, sWidth, sHeight, targetX, targetY, targetW, targetH);
}

/**
 * Helper to determine if a color is light or dark (for optimal shadow rendering)
 */
function isLightColor(colorStr: string): boolean {
  if (!colorStr) return true;
  let hex = colorStr.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map((c) => c + c).join('');
  }
  const r = parseInt(hex.substring(0, 2), 16) || 255;
  const g = parseInt(hex.substring(2, 4), 16) || 255;
  const b = parseInt(hex.substring(4, 6), 16) || 255;
  // Perceived brightness formula
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 140;
}

/**
 * Composites the personalized flyer at native flyer dimensions using normalized coordinates
 */
export async function renderPersonalisedFlyer(payload: CompositePayload): Promise<HTMLCanvasElement> {
  const { flyerImageUrl, participantImageUrl, participantName, template, cropSettings } = payload;

  const [flyerImg, participantImg] = await Promise.all([
    loadImage(flyerImageUrl),
    loadImage(participantImageUrl),
  ]);

  const canvas = document.createElement('canvas');
  const width = flyerImg.naturalWidth || 1080;
  const height = flyerImg.naturalHeight || 1350;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not initialize 2D rendering canvas.');

  // 1. Draw base flyer at original full resolution (pixel-perfect)
  ctx.drawImage(flyerImg, 0, 0, width, height);

  // 2. Compute absolute coordinates from normalized template coordinates [0, 1]
  const photoX = Number(template.photo_x) * width;
  const photoY = Number(template.photo_y) * height;
  const photoW = Number(template.photo_width) * width;
  const photoH = Number(template.photo_height) * height;
  // Frame scale allows expanding or shrinking the cutout to fill white flyer placeholders
  const frameScale = cropSettings?.frameScale ?? template.photo_crop_settings?.frameScale ?? 1.0;
  const centerX = photoX + photoW / 2;
  const centerY = photoY + photoH / 2;

  let drawX = photoX;
  let drawY = photoY;
  let drawW = photoW;
  let drawH = photoH;

  // 3. Render Participant Photo with shape clipping and custom zoom/pan
  ctx.save();
  ctx.beginPath();
  if (template.photo_shape === 'circle') {
    const radius = (Math.min(photoW, photoH) / 2) * frameScale;
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2, true);
    drawX = centerX - radius;
    drawY = centerY - radius;
    drawW = radius * 2;
    drawH = radius * 2;
  } else {
    // Rounded rectangle or sharp rectangle
    const targetW = photoW * frameScale;
    const targetH = photoH * frameScale;
    const targetX = centerX - targetW / 2;
    const targetY = centerY - targetH / 2;
    const cornerRadius = template.photo_crop_settings?.borderRadius ?? (Math.min(targetW, targetH) * 0.08);
    ctx.roundRect(targetX, targetY, targetW, targetH, cornerRadius);
    drawX = targetX;
    drawY = targetY;
    drawW = targetW;
    drawH = targetH;
  }
  ctx.closePath();
  ctx.clip();

  const zoom = cropSettings?.zoom ?? template.photo_crop_settings?.zoom ?? 1.0;
  const offsetX = cropSettings?.offsetX ?? 0;
  const offsetY = cropSettings?.offsetY ?? 0;

  drawImageCoverWithCrop(ctx, participantImg, drawX, drawY, drawW, drawH, zoom, offsetX, offsetY);
  ctx.restore();

  // 4. Render Participant Name with strict auto-fitting into designated bounding box
  const nameBoxX = Number(template.name_x) * width;
  const nameBoxY = Number(template.name_y) * height;
  const nameBoxW = Number(template.name_width) * width;
  const nameBoxH = Number(template.name_height) * height;

  // Baseline scale relative to standard 1080px width
  const scale = width / 1080;
  
  // Constrain font size by both target box height AND width so it fits within any banner
  const maxFontByHeight = Math.max(14, nameBoxH * 0.72);
  let dynamicFontSize = Math.min(Number(template.font_size || 44) * scale, maxFontByHeight);
  const minFontSize = Math.max(12, maxFontByHeight * 0.35);

  ctx.save();
  const textColor = template.text_color || '#FFFFFF';
  ctx.fillStyle = textColor;
  ctx.textAlign = template.text_alignment || 'center';
  ctx.textBaseline = 'middle';

  const fontFamily = template.font_family || 'Plus Jakarta Sans, sans-serif';
  const fontWeight = template.font_weight || '700';

  // Measure text and downscale iteratively so participantName fits comfortably inside nameBoxW
  ctx.font = `${fontWeight} ${dynamicFontSize}px ${fontFamily}`;
  const maxAllowedWidth = nameBoxW * 0.92; // 8% breathing margin
  
  while (ctx.measureText(participantName).width > maxAllowedWidth && dynamicFontSize > minFontSize) {
    dynamicFontSize -= 1.5;
    ctx.font = `${fontWeight} ${dynamicFontSize}px ${fontFamily}`;
  }

  // Anchor text coordinate according to alignment
  let targetTextX = nameBoxX + nameBoxW / 2;
  if (template.text_alignment === 'left') targetTextX = nameBoxX + (nameBoxW * 0.04);
  if (template.text_alignment === 'right') targetTextX = nameBoxX + (nameBoxW * 0.96);

  const targetTextY = nameBoxY + nameBoxH / 2;

  // Intelligently render shadow: If text is light, use drop shadow; if dark, use subtle clean ambient
  if (isLightColor(textColor)) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 6 * scale;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2 * scale;
  } else {
    // For dark text on light flyer badges (like cream or white boxes), use clean crisp rendering
    ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
    ctx.shadowBlur = 2 * scale;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 1 * scale;
  }

  ctx.fillText(participantName, targetTextX, targetTextY, maxAllowedWidth);
  ctx.restore();

  return canvas;
}

/**
 * Downloads canvas as PNG or JPG file
 */
export function downloadCanvasAsImage(
  canvas: HTMLCanvasElement,
  filename: string,
  format: 'png' | 'jpg'
) {
  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
  const quality = format === 'png' ? 1.0 : 0.95;
  const dataUrl = canvas.toDataURL(mimeType, quality);

  const cleanFilename = filename.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-');
  const link = document.createElement('a');
  link.download = `${cleanFilename}.${format}`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Downloads canvas as PDF preserving aspect ratio and print quality
 */
export function downloadCanvasAsPDF(canvas: HTMLCanvasElement, filename: string) {
  const orientation = canvas.width > canvas.height ? 'landscape' : 'portrait';
  const pdf = new jsPDF({
    orientation: orientation as any,
    unit: 'px',
    format: [canvas.width, canvas.height],
    hotfixes: ['px_scaling'],
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);

  const cleanFilename = filename.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-');
  pdf.save(`${cleanFilename}.pdf`);
}

/**
 * Confetti trigger
 */
export function triggerFlyerCelebration() {
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#6425E8', '#16A34A', '#F59E0B', '#3B82F6', '#EC4899'],
  });
}
