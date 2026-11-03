import jsPDF from 'jspdf';
import confetti from 'canvas-confetti';
import { FlyerTemplate } from '../types/database';

export interface PhotoCropSettings {
  zoom?: number; // 1.0 to 3.5 (100% to 350%)
  offsetX?: number; // Normalized pan X relative to slot width
  offsetY?: number; // Normalized pan Y relative to slot height
  textColor?: string; // Optional override for text color
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
      if (src.startsWith('data:') || src.startsWith('blob:') || src.startsWith('/')) {
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
 * Draws an image into the target bounding box with 1:1 WYSIWYG cover scaling, zoom,
 * and clamped pan offsets. Guarantees the photo completely fills the target area
 * without ANY empty gaps or letterboxing.
 */
export function drawImageCoverWithCrop(
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
  const naturalW = img.naturalWidth || 1000;
  const naturalH = img.naturalHeight || 1000;

  const baseScale = Math.max(targetW / naturalW, targetH / naturalH);
  const effectiveZoom = Math.max(1.0, zoom);
  const renderW = naturalW * baseScale * effectiveZoom;
  const renderH = naturalH * baseScale * effectiveZoom;

  const defaultLeft = (targetW - renderW) / 2;
  const defaultTop = (targetH - renderH) / 2;

  // Strict boundary clamping matching the DOM preview 1:1
  const minDrawLeft = targetW - renderW;
  const minDrawTop = targetH - renderH;

  const rawLeft = defaultLeft + offsetX * targetW;
  const rawTop = defaultTop + offsetY * targetH;

  const clampedDrawLeft = Math.min(0, Math.max(minDrawLeft, rawLeft));
  const clampedDrawTop = Math.min(0, Math.max(minDrawTop, rawTop));

  ctx.drawImage(img, targetX + clampedDrawLeft, targetY + clampedDrawTop, renderW, renderH);
}

/**
 * Helper to determine if a color is light or dark (for optimal shadow rendering)
 */
export function isLightColor(colorStr: string): boolean {
  if (!colorStr) return true;
  let hex = colorStr.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map((c) => c + c).join('');
  }
  const r = parseInt(hex.substring(0, 2), 16) || 255;
  const g = parseInt(hex.substring(2, 4), 16) || 255;
  const b = parseInt(hex.substring(4, 6), 16) || 255;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150;
}

/**
 * Composites the personalized flyer at native flyer dimensions using normalized coordinates.
 * Coordinates and scale are 100% matched to the DOM preview (exact 1:1 WYSIWYG).
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

  // 2. Compute absolute coordinates matching the CSS DOM preview 1:1
  const slotX = Number(template.photo_x) * width;
  const slotY = Number(template.photo_y) * height;
  const slotW = Number(template.photo_width) * width;
  // For circle: height equals width in pixels (aspect-ratio: 1 / 1)
  const slotH = template.photo_shape === 'circle' ? slotW : Number(template.photo_height) * height;

  // 3. Render Participant Photo with shape clipping and clamped cover scaling
  ctx.save();
  ctx.beginPath();
  if (template.photo_shape === 'circle') {
    const radius = slotW / 2;
    const centerX = slotX + radius;
    const centerY = slotY + radius;
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2, true);
  } else {
    const cornerRadius = template.photo_crop_settings?.borderRadius ?? Math.min(slotW, slotH) * 0.08;
    ctx.roundRect(slotX, slotY, slotW, slotH, cornerRadius);
  }
  ctx.closePath();
  ctx.clip();

  const zoom = Math.max(1.0, cropSettings?.zoom ?? 1.0);
  const offsetX = cropSettings?.offsetX ?? 0;
  const offsetY = cropSettings?.offsetY ?? 0;

  drawImageCoverWithCrop(ctx, participantImg, slotX, slotY, slotW, slotH, zoom, offsetX, offsetY);
  ctx.restore();

  // 4. Render Participant Name directly at template position
  const nameBoxX = Number(template.name_x) * width;
  const nameBoxY = Number(template.name_y) * height;
  const nameBoxW = Number(template.name_width) * width;
  const nameBoxH = Number(template.name_height) * height;

  const scale = width / 1080;

  // Intelligent text color contrast detection
  let textColor = cropSettings?.textColor || template.text_color || '#111126';
  try {
    const sampleBox = ctx.getImageData(
      Math.max(0, Math.floor(nameBoxX + nameBoxW * 0.25)),
      Math.max(0, Math.floor(nameBoxY + nameBoxH * 0.25)),
      Math.max(1, Math.floor(nameBoxW * 0.5)),
      Math.max(1, Math.floor(nameBoxH * 0.5))
    );
    let totalLuminance = 0;
    const count = sampleBox.data.length / 4;
    for (let i = 0; i < sampleBox.data.length; i += 4) {
      totalLuminance += (sampleBox.data[i] * 299 + sampleBox.data[i + 1] * 587 + sampleBox.data[i + 2] * 114) / 1000;
    }
    const avgLum = totalLuminance / (count || 1);
    // If flyer background behind the name is bright (like a white banner box), use high-contrast dark text
    if (avgLum > 150 && isLightColor(textColor)) {
      textColor = '#111126';
    } else if (avgLum < 80 && !isLightColor(textColor)) {
      textColor = '#FFFFFF';
    }
  } catch {
    // If canvas is tainted or cannot sample, retain current textColor
  }

  // Constrain font size by target box height and width
  const maxFontByHeight = Math.max(16, nameBoxH * 0.78);
  let dynamicFontSize = Math.min(Number(template.font_size || 42) * scale, maxFontByHeight);
  const minFontSize = Math.max(12, maxFontByHeight * 0.35);

  ctx.save();
  ctx.fillStyle = textColor;
  ctx.textAlign = template.text_alignment || 'center';
  ctx.textBaseline = 'middle';

  const fontFamily = template.font_family || 'Plus Jakarta Sans, sans-serif';
  const fontWeight = template.font_weight || '700';

  // Measure text and downscale iteratively so participantName fits comfortably inside nameBoxW
  ctx.font = `${fontWeight} ${dynamicFontSize}px ${fontFamily}`;
  const maxAllowedWidth = nameBoxW * 0.92;

  while (ctx.measureText(participantName).width > maxAllowedWidth && dynamicFontSize > minFontSize) {
    dynamicFontSize -= 1.5;
    ctx.font = `${fontWeight} ${dynamicFontSize}px ${fontFamily}`;
  }

  // Anchor text coordinate according to alignment
  let targetTextX = nameBoxX + nameBoxW / 2;
  if (template.text_alignment === 'left') targetTextX = nameBoxX + nameBoxW * 0.04;
  if (template.text_alignment === 'right') targetTextX = nameBoxX + nameBoxW * 0.96;

  const targetTextY = nameBoxY + nameBoxH / 2;

  // Intelligently render shadow based on text luminance
  if (isLightColor(textColor)) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = 6 * scale;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2 * scale;
  } else {
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
